import { useMemo, useState } from 'react';
import { BrowserRouter, Link, Route, Routes, useNavigate } from 'react-router-dom';
import primaryLayout from '../../server/layouts/primary.json';
import secondaryLayout from '../../server/layouts/secondary.json';

const parentResult = {
  studentName: 'Aisha Adebayo',
  className: 'Primary 4',
  termName: '2026/2027 Term 1',
  sessionName: '2026/2027',
  studentNo: 'ADM-0001',
  average: 82.5,
  classAverage: 74.8,
  attendance: '96%',
  nextTermTarget: 'Maintain consistent A and B grades',
  teacherComment: 'Aisha is attentive in class and has shown good improvement in reading and mathematics this term.',
  principalComment: 'Aisha demonstrates a positive attitude to learning and is making steady academic progress.',
  rows: [
    { subject: 'English Language', test: 82, exam: 88, total: 170, grade: 'A', position: '2nd' },
    { subject: 'Mathematics', test: 79, exam: 90, total: 169, grade: 'A', position: '1st' },
    { subject: 'Science', test: 74, exam: 80, total: 154, grade: 'B', position: '4th' },
    { subject: 'Social Studies', test: 69, exam: 75, total: 144, grade: 'B', position: '6th' },
    { subject: 'Computer Studies', test: 84, exam: 87, total: 171, grade: 'A', position: '3rd' },
    { subject: 'CRS', test: 76, exam: 82, total: 158, grade: 'B', position: '5th' },
  ],
};

function StaffLoginPage() {
  const navigate = useNavigate();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate('/parent-login');
  };

  return (
    <div className="login-card">
      <h2>Staff login</h2>
      <form className="login-form" onSubmit={handleSubmit}>
        <label>
          Email
          <input type="email" name="email" defaultValue="admin@cedarmodel.local" />
        </label>
        <label>
          Password
          <input type="password" name="password" defaultValue="Admin123!" />
        </label>
        <button type="submit">Sign in</button>
      </form>
      <Link to="/parent-login">Parent login</Link>
    </div>
  );
}

function ParentLoginPage() {
  const navigate = useNavigate();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const admissionNumber = String(formData.get('admissionNumber') ?? '').trim();
    const accessCode = String(formData.get('accessCode') ?? '').trim();

    if (admissionNumber === 'ADM-0001' && accessCode === 'CODE1234') {
      navigate('/results');
      return;
    }

    alert('Invalid credentials or account locked.');
  };

  return (
    <div className="login-card">
      <h2>Parent login</h2>
      <form className="login-form" onSubmit={handleSubmit}>
        <label>
          Admission number
          <input type="text" name="admissionNumber" defaultValue="ADM-0001" />
        </label>
        <label>
          Access code
          <input type="password" name="accessCode" defaultValue="CODE1234" />
        </label>
        <button type="submit">View results</button>
      </form>
      <Link to="/staff-login">Staff login</Link>
    </div>
  );
}

function ParentResultsPage() {
  const layout = primaryLayout as {
    sections: Array<{
      type: string;
      title: string;
      fields?: Array<{ key: string; label: string }>;
      columns?: Array<{ key: string; label: string }>;
    }>;
  };

  return (
    <div className="results-page">
      <div className="results-header">
        <div>
          <p className="eyebrow">Current term</p>
          <h2>{parentResult.termName}</h2>
        </div>
        <div className="student-badge">
          <strong>{parentResult.studentName}</strong>
          <span>{parentResult.studentNo}</span>
        </div>
      </div>

      {layout.sections.map((section) => {
        if (section.type === 'header') {
          return (
            <section key={section.title} className="result-panel">
              <h3>{section.title}</h3>
              <div className="field-grid">
                {section.fields?.map((field) => (
                  <div key={field.key} className="field-item">
                    <span>{field.label}</span>
                    <strong>{String((parentResult as Record<string, unknown>)[field.key] ?? '—')}</strong>
                  </div>
                ))}
              </div>
            </section>
          );
        }

        if (section.type === 'subjects') {
          return (
            <section key={section.title} className="result-panel">
              <h3>{section.title}</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      {section.columns?.map((column) => (
                        <th key={column.key}>{column.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parentResult.rows.map((row) => (
                      <tr key={row.subject}>
                        {section.columns?.map((column) => (
                          <td key={`${row.subject}-${column.key}`}>{String((row as Record<string, unknown>)[column.key] ?? '—')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        }

        if (section.type === 'summary') {
          return (
            <section key={section.title} className="result-panel">
              <h3>{section.title}</h3>
              <div className="summary-grid">
                {section.fields?.map((field) => (
                  <div key={field.key} className="summary-item">
                    <span>{field.label}</span>
                    <strong>{String((parentResult as Record<string, unknown>)[field.key] ?? '—')}</strong>
                  </div>
                ))}
              </div>
            </section>
          );
        }

        return (
          <section key={section.title} className="result-panel">
            <h3>{section.title}</h3>
            <div className="comment-stack">
              {section.fields?.map((field) => (
                <div key={field.key} className="comment-box">
                  <span>{field.label}</span>
                  <p>{String((parentResult as Record<string, unknown>)[field.key] ?? '—')}</p>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function StudentManagementPage() {
  const [students, setStudents] = useState([
    { id: 1, firstName: 'Ada', lastName: 'Okafor', admissionNumber: 'ADM-0001', className: 'Primary 4', parentPhone: '08031234567', active: true },
    { id: 2, firstName: 'Femi', lastName: 'Bello', admissionNumber: 'ADM-0002', className: 'Primary 4', parentPhone: '08036543210', active: true },
    { id: 3, firstName: 'Tosin', lastName: 'Adeyemi', admissionNumber: 'ADM-0003', className: 'Primary 5', parentPhone: '07023456789', active: false },
  ]);

  const [preview, setPreview] = useState<Array<{ firstName: string; lastName: string; admissionNumber: string; className: string; parentPhone: string }>>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [code, setCode] = useState('R7K4X2Q9');

  const previewRows = useMemo(() => preview.length > 0 ? preview : students.map(({ firstName, lastName, admissionNumber, className, parentPhone }) => ({ firstName, lastName, admissionNumber, className, parentPhone })), [preview, students]);

  const parseCsv = (input: string) => {
    const lines = input.replace(/\r/g, '').split('\n').filter((line) => line.trim().length > 0);
    if (lines.length < 2) {
      setErrors(['No rows were provided for import.']);
      setPreview([]);
      return;
    }

    const headers = lines[0].split(',').map((header) => header.trim().toLowerCase());
    const required = ['first name', 'last name', 'admission number', 'class', 'parent phone number'];
    const missing = required.filter((header) => !headers.includes(header));
    if (missing.length > 0) {
      setErrors([`Missing required columns: ${missing.join(', ')}`]);
      setPreview([]);
      return;
    }

    const nextPreview: Array<{ firstName: string; lastName: string; admissionNumber: string; className: string; parentPhone: string }> = [];
    const nextErrors: string[] = [];

    for (let rowIndex = 1; rowIndex < lines.length; rowIndex += 1) {
      const values = lines[rowIndex].split(',');
      const record: Record<string, string> = {};
      headers.forEach((header, index) => {
        record[header] = values[index]?.trim() ?? '';
      });

      const firstName = record['first name'];
      const lastName = record['last name'];
      const admissionNumber = record['admission number'];
      const className = record.class;
      const parentPhone = record['parent phone number'].replace(/\D/g, '');

      if (!firstName || !lastName || !admissionNumber || !className || parentPhone.length < 10) {
        nextErrors.push(`Row ${rowIndex + 1}: missing required fields for first name, last name, or parent phone number.`);
        continue;
      }

      nextPreview.push({
        firstName,
        lastName,
        admissionNumber,
        className,
        parentPhone: parentPhone.startsWith('234') ? `0${parentPhone.slice(3)}` : parentPhone,
      });
    }

    setErrors(nextErrors);
    setPreview(nextPreview);
  };

  const importCsv = `First name,Last name,Admission number,Class,Date of birth,Parent/Guardian name,Parent/Guardian address,Parent phone number,Religion,Sex\nAda,Okafor,ADM-0001,Primary 4,2014-11-01,Grace Okafor,"10 Main Street, Lagos",08031234567,Christian,Female\nFemi,Bello,ADM-0002,Primary 4,2015-03-17,Jane Bello,"15 Broad Road, Lagos",2348036543210,Muslim,Male\n, ,ADM-0003,Primary 4,2014-09-21,Grace Okafor,"10 Main Street, Lagos",,Christian,Female`;

  const importStudents = () => {
    if (preview.length === 0) return;

    const newStudents = preview.map((item, index) => ({
      id: students.length + index + 1,
      firstName: item.firstName,
      lastName: item.lastName,
      admissionNumber: item.admissionNumber,
      className: item.className,
      parentPhone: item.parentPhone,
      active: true,
    }));

    setStudents((current) => [...current, ...newStudents]);
    setPreview([]);
    setErrors([]);
  };

  const regenerateCode = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let nextCode = code;
    while (nextCode === code) {
      nextCode = Array.from({ length: 8 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
    }
    setCode(nextCode);
  };

  return (
    <div className="students-page">
      <div className="students-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h2>Student management</h2>
        </div>
        <button type="button" className="secondary-button" onClick={() => parseCsv(importCsv)}>Preview import</button>
      </div>

      <div className="student-panel">
        <h3>Register import</h3>
        <textarea value={importCsv} onChange={(event) => parseCsv(event.target.value)} rows={8} />
        {errors.length > 0 && (
          <ul className="error-list">
            {errors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        )}
        {previewRows.length > 0 && (
          <div className="preview-box">
            <h4>Preview (stored fields only)</h4>
            <table>
              <thead>
                <tr>
                  <th>First name</th>
                  <th>Last name</th>
                  <th>Admission</th>
                  <th>Class</th>
                  <th>Parent phone</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, index) => (
                  <tr key={`${row.admissionNumber}-${index}`}>
                    <td>{row.firstName}</td>
                    <td>{row.lastName}</td>
                    <td>{row.admissionNumber}</td>
                    <td>{row.className}</td>
                    <td>{row.parentPhone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" className="primary-button" onClick={importStudents}>Add valid rows</button>
          </div>
        )}
      </div>

      <div className="student-panel">
        <h3>Access codes</h3>
        <div className="code-box">
          <span>Generated code</span>
          <strong>{code}</strong>
          <button type="button" className="secondary-button" onClick={regenerateCode}>Regenerate</button>
        </div>
      </div>

      <div className="student-panel">
        <h3>Student list</h3>
        <table>
          <thead>
            <tr>
              <th>Admission</th>
              <th>Name</th>
              <th>Class</th>
              <th>Parent phone</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td>{student.admissionNumber}</td>
                <td>{student.firstName} {student.lastName}</td>
                <td>{student.className}</td>
                <td>{student.parentPhone}</td>
                <td>{student.active ? 'Active' : 'Inactive'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="topbar">
          <h1>School Results Portal</h1>
        </header>

        <main className="page-shell">
          <Routes>
            <Route path="/" element={<StaffLoginPage />} />
            <Route path="/staff-login" element={<StaffLoginPage />} />
            <Route path="/parent-login" element={<ParentLoginPage />} />
            <Route path="/results" element={<ParentResultsPage />} />
            <Route path="/students" element={<StudentManagementPage />} />
            <Route path="*" element={<div className="placeholder">Route placeholder.</div>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
