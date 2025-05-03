import React, { useState, useEffect } from 'react';
import { CSVImporter } from './components/CSVImporter'; // Adjust path as needed based on the actual structure
import { authApi, schemaApi, importApi } from './services/api';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [schemas, setSchemas] = useState([]);
  const [selectedSchemaId, setSelectedSchemaId] = useState(null);
  const [schemaTemplate, setSchemaTemplate] = useState(null);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [importJob, setImportJob] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Load user and schemas when token changes
  useEffect(() => {
    if (token) {
      loadUserAndSchemas();
    }
  }, [token]);
  
  // Load schema template when schema ID changes
  useEffect(() => {
    if (token && selectedSchemaId) {
      loadSchemaTemplate();
    }
  }, [selectedSchemaId]);
  
  const loadUserAndSchemas = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get current user
      const userData = await authApi.getCurrentUser(token);
      setUser(userData);
      
      // Get schemas
      const schemasData = await schemaApi.getSchemas(token);
      setSchemas(schemasData);
      
      // Set first schema as selected if available
      if (schemasData.length > 0 && !selectedSchemaId) {
        setSelectedSchemaId(schemasData[0].id);
      }
    } catch (err) {

      setError('Failed to load user data. Please log in again.');
      // Clear token if unauthorized
      if (err.message.includes('401')) {
        handleLogout();
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadSchemaTemplate = async () => {
    setIsLoading(true);
    
    try {
      const template = await schemaApi.getSchemaTemplate(token, selectedSchemaId);
      setSchemaTemplate(template);
    } catch (err) {

      setError('Failed to load schema template.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleLogin = async (email, password) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await authApi.login(email, password);
      setToken(data.access_token);
      localStorage.setItem('token', data.access_token);
    } catch (err) {

      setError('Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setSchemas([]);
    setSelectedSchemaId(null);
    setSchemaTemplate(null);
    localStorage.removeItem('token');
  };
  
  const handleImportComplete = async (data) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await importApi.processCSVData(token, selectedSchemaId, data);
      setImportJob(result);
      setIsImporterOpen(false);
    } catch (err) {

      setError('Failed to process import. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Login form component
  const LoginForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    const handleSubmit = (e) => {
      e.preventDefault();
      handleLogin(email, password);
    };
    
    return (
      <div className="login-container">
        <h2>ImportCSV Login</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p>Use admin@example.com / admin123 to login</p>
      </div>
    );
  };
  
  // Import job status component
  const ImportJobStatus = ({ job }) => {
    return (
      <div className="import-job-status">
        <h3>Import Job Status</h3>
        <p>Job ID: {job.job_id}</p>
        <p>Status: {job.status}</p>
        <p>Total Rows: {job.total_rows}</p>
        <p>Valid Rows: {job.valid_rows}</p>
        <p>Invalid Rows: {job.invalid_rows}</p>
      </div>
    );
  };
  
  // If no token, show login form
  if (!token) {
    return <LoginForm />;
  }
  
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>ImportCSV</h1>
        <div className="user-info">
          {user && <span>Welcome, {user.email}</span>}
          <button onClick={handleLogout}>Logout</button>
        </div>
      </header>
      
      <main className="app-main">
        {error && <div className="error-message">{error}</div>}
        
        {isLoading && <div className="loading">Loading...</div>}
        
        <div className="schema-selector">
          <label htmlFor="schema-select">Select Schema:</label>
          <select
            id="schema-select"
            value={selectedSchemaId || ''}
            onChange={(e) => setSelectedSchemaId(Number(e.target.value))}
            disabled={isLoading || schemas.length === 0}
          >
            <option value="">Select a schema</option>
            {schemas.map(schema => (
              <option key={schema.id} value={schema.id}>{schema.name}</option>
            ))}
          </select>
          
          <button
            onClick={() => setIsImporterOpen(true)}
            disabled={!selectedSchemaId || isLoading}
          >
            Import CSV
          </button>
        </div>
        
        {importJob && <ImportJobStatus job={importJob} />}
        
        {schemaTemplate && (
          <CSVImporter
            isModal={true}
            modalIsOpen={isImporterOpen}
            modalOnCloseTriggered={() => setIsImporterOpen(false)}
            onComplete={handleImportComplete}
            template={schemaTemplate.template}
          />
        )}
      </main>
    </div>
  );
}

export default App;
