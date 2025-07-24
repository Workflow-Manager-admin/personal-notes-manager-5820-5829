import React, { useState, useEffect, useCallback } from "react";
import "./App.css";

// Theme Colors based on project requirements
const COLORS = {
  primary: "#3B82F6",
  secondary: "#6366F1",
  accent: "#F59E42",
  lightBg: "#ffffff",
  darkText: "#222",
  border: "#E5E7EB"
};

// Helper for HTTP requests to backend API
const API_BASE = "/api"; // Ensure correct proxy setup if running locally

async function apiRequest(endpoint, method = "GET", data, token) {
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include"
  };
  if (data) opts.body = JSON.stringify(data);
  if (token) opts.headers["Authorization"] = "Bearer " + token;
  const res = await fetch(API_BASE + endpoint, opts);
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch { err = { detail: res.statusText }; }
    throw new Error(err.detail || "Error");
  }
  return res.json();
}

// PUBLIC_INTERFACE
function App() {
  // Auth state
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [authView, setAuthView] = useState("login"); // 'login' | 'register'
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // Notes State
  const [notes, setNotes] = useState([]);
  const [selectedNoteID, setSelectedNoteID] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [noteError, setNoteError] = useState("");
  const [editingNote, setEditingNote] = useState(null); // {id, title, content}

  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme] = useState("light"); // Only light theme for now as per instructions

  // Fetch notes list on login or changes
  const fetchNotes = useCallback(() => {
    if (!token) return;
    setLoadingNotes(true);
    setNoteError("");
    // Query with optional search
    let url = "/notes/";
    if (searchQuery) url += `?search=${encodeURIComponent(searchQuery)}`;
    apiRequest(url, "GET", null, token)
      .then((data) => setNotes(data))
      .catch((e) => setNoteError(e.message))
      .finally(() => setLoadingNotes(false));
  }, [token, searchQuery]);

  // Select first note if available
  useEffect(() => {
    if (notes.length > 0 && !selectedNoteID) {
      setSelectedNoteID(notes[0].id);
      setEditingNote(null);
    }
    if (notes.length === 0) {
      setSelectedNoteID(null);
      setEditingNote(null);
    }
  }, [notes, selectedNoteID]);

  // Re-fetch notes on token/search
  useEffect(() => {
    if (token) fetchNotes();
  }, [token, fetchNotes]);

  // Get selected note object
  const selectedNote = notes.find((n) => n.id === selectedNoteID);

  // PUBLIC_INTERFACE
  async function handleAuthSubmit(evt) {
    evt.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    const form = evt.target;
    const username = form.username.value;
    const password = form.password.value;
    if (authView === "register") {
      const password2 = form.password2.value;
      if (password !== password2) {
        setAuthError("Passwords do not match");
        setAuthLoading(false);
        return;
      }
      try {
        await apiRequest("/users/register/", "POST", { username, password });
        setAuthView("login");
        setAuthLoading(false);
        setAuthError("Registration successful. Please log in.");
      } catch (e) {
        setAuthError(e.message);
        setAuthLoading(false);
      }
    } else {
      try {
        // Login returns {token, user}
        const data = await apiRequest("/users/login/", "POST", { username, password });
        setToken(data.token);
        setUser(data.user);
      } catch (e) {
        setAuthError(e.message);
      } finally {
        setAuthLoading(false);
      }
    }
  }

  // PUBLIC_INTERFACE
  function handleLogout() {
    setUser(null);
    setToken(null);
    setNotes([]);
    setSelectedNoteID(null);
    setEditingNote(null);
    setAuthView("login");
    setAuthError("");
  }

  // PUBLIC_INTERFACE
  function handleNewNote() {
    setEditingNote({ id: null, title: "", content: "" });
    setSelectedNoteID(null);
  }

  // PUBLIC_INTERFACE
  async function handleSaveNote(evt) {
    evt.preventDefault();
    const { id, title, content } = editingNote || {};
    try {
      let note;
      if (id) {
        note = await apiRequest(`/notes/${id}/`, "PUT", { title, content }, token);
        setNotes((old) => old.map((n) => (n.id === id ? note : n)));
      } else {
        note = await apiRequest("/notes/", "POST", { title, content }, token);
        setNotes((old) => [note, ...old]);
      }
      setEditingNote(null);
      setSelectedNoteID(note.id);
    } catch (e) {
      setNoteError(e.message);
    }
  }

  // PUBLIC_INTERFACE
  async function handleDeleteNote(id) {
    if (!window.confirm("Delete this note?")) return;
    try {
      await apiRequest(`/notes/${id}/`, "DELETE", null, token);
      setNotes((old) => old.filter((n) => n.id !== id));
      if (selectedNoteID === id || (editingNote && editingNote.id === id)) {
        setSelectedNoteID(null);
        setEditingNote(null);
      }
    } catch (e) {
      setNoteError(e.message);
    }
  }

  // PUBLIC_INTERFACE
  function handleEditNote(note) {
    setEditingNote({ ...note });
    setSelectedNoteID(null);
  }

  // PUBLIC_INTERFACE
  function handleSelectNote(id) {
    setEditingNote(null);
    setSelectedNoteID(id);
  }

  // PUBLIC_INTERFACE
  function handleSearch(evt) {
    setSearchQuery(evt.target.value);
    // fetchNotes will trigger from useEffect().
  }

  // Styling injection for theme and accent colors
  useEffect(() => {
    document.body.style.background = COLORS.lightBg;
    document.body.style.color = COLORS.darkText;
  }, []);

  // --- RENDER ---
  if (!user || !token) {
    // Auth View (Login/Register)
    return (
      <div className="auth-outer" style={{
        display: "flex", minHeight: "100vh", justifyContent: "center", alignItems: "center",
        background: COLORS.lightBg
      }}>
        <div
          className="auth-card"
          style={{
            boxShadow: "0 2px 12px #0002",
            borderRadius: 12,
            minWidth: 330,
            padding: "2.5rem 2rem",
            background: "#fff"
          }}
        >
          <h2
            style={{
              color: COLORS.primary,
              textAlign: "center",
              marginBottom: 24,
              fontWeight: "bold"
            }}
          >
            {authView === "login" ? "Login" : "Sign Up"}
          </h2>
          <form onSubmit={handleAuthSubmit}>
            <label style={{ display: "block", marginBottom: 8, color: COLORS.secondary }}>
              Username
              <input name="username" type="text" required autoFocus style={{
                width: "100%",
                marginTop: 4,
                marginBottom: 14,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 6,
                padding: 8
              }}/>
            </label>
            <label style={{ display: "block", marginBottom: 8, color: COLORS.secondary }}>
              Password
              <input name="password" type="password" required style={{
                width: "100%",
                marginTop: 4,
                marginBottom: 14,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 6,
                padding: 8,
              }}/>
            </label>
            {authView === "register" && (
              <label style={{ display: "block", marginBottom: 8, color: COLORS.secondary }}>
                Confirm Password
                <input name="password2" type="password" required style={{
                  width: "100%",
                  marginTop: 4,
                  marginBottom: 14,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 6,
                  padding: 8,
                }}/>
              </label>
            )}
            {authError && (
              <div style={{ color: "#C81D25", padding: "4px 0", textAlign: "center" }}>{authError}</div>
            )}
            <button
              disabled={authLoading}
              type="submit"
              style={{
                width: "100%",
                background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.secondary})`,
                border: "none",
                color: "#fff",
                padding: "12px 0",
                borderRadius: 7,
                fontWeight: 700,
                fontSize: 16,
                margin: "10px 0 6px 0",
                cursor: "pointer",
                transition: "opacity 0.2s"
              }}
            >
              {authView === "login" ? "Login" : "Create Account"}
            </button>
          </form>
          <div style={{ textAlign: "center", marginTop: 10 }}>
            <button
              onClick={() => { setAuthView(authView === "login" ? "register" : "login"); setAuthError(""); }}
              style={{
                background: "none",
                border: "none",
                color: COLORS.accent,
                cursor: "pointer",
                textDecoration: "underline"
              }}
            >
              {authView === "login" ? "Don't have an account? Sign up" : "Back to Login"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Layout (Sidebar, Header, Main Area)
  return (
    <div className="main-app" style={{
      display: "flex",
      minHeight: "100vh",
      background: COLORS.lightBg,
      color: COLORS.darkText,
      fontFamily: "Inter,Segoe UI,sans-serif"
    }}>
      {/* Sidebar */}
      <nav className="sidebar" style={{
        width: sidebarOpen ? 260 : 54,
        minWidth: sidebarOpen ? 260 : 54,
        background: "#FAFAFE",
        borderRight: `1px solid ${COLORS.border}`,
        transition: "width 0.16s cubic-bezier(.5,1,.89,.96)",
        display: "flex",
        flexDirection: "column",
        position: "relative"
      }}>
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", padding: 14
        }}>
          <button
            aria-label="Collapse sidebar"
            style={{
              background: "none",
              border: "none",
              fontSize: 24,
              color: COLORS.secondary,
              marginBottom: 10,
              cursor: "pointer"
            }}
            onClick={() => setSidebarOpen((s) => !s)}
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? "⏴" : "⏵"}
          </button>
          {sidebarOpen && (
            <h1 style={{
              color: COLORS.primary,
              fontSize: 24,
              fontWeight: 900,
              letterSpacing: "-0.01em",
              margin: "8px 0 18px 0"
            }}>
              Notes
            </h1>
          )}
          <button
            className="new-note"
            onClick={handleNewNote}
            style={{
              background: `linear-gradient(92deg, ${COLORS.primary} 60%, ${COLORS.accent})`,
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: sidebarOpen ? "11px 14px" : "10px",
              width: "100%",
              minWidth: 36,
              fontWeight: 700,
              fontSize: 16,
              marginBottom: 7,
              marginTop: 9,
              cursor: "pointer",
              transition: "box-shadow 0.18s",
              boxShadow: "0 2px 4px #6366F118",
            }}
            title="New note"
          >{sidebarOpen ? "+ New Note" : "+"}</button>
          <div style={{ width: "100%", marginTop: 12 }}>
            {sidebarOpen && (
              <input
                type="search"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={handleSearch}
                style={{
                  width: "98%",
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 6,
                  padding: "7px 11px",
                  color: COLORS.darkText,
                  background: "#fff",
                  fontSize: 15,
                  fontWeight: 400
                }}
              />
            )}
          </div>
        </div>
        {/* Notes List */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          marginTop: 8
        }}>
          {loadingNotes ? (
            <div style={{ padding: 18, color: COLORS.secondary, textAlign: "center" }}>Loading...</div>
          ) : notes.length === 0 ? (
            <div style={{ padding: 18, color: COLORS.accent, textAlign: "center" }}>
              {searchQuery ? "No matching notes." : "No notes yet."}
            </div>
          ) : (
            <ul style={{
              listStyle: "none",
              paddingLeft: 0,
              margin: 0
            }}>
              {notes.map((note) => (
                <li
                  key={note.id}
                  onClick={() => handleSelectNote(note.id)}
                  style={{
                    background: (selectedNoteID === note.id && !editingNote)
                      ? COLORS.secondary + "14"
                      : "transparent",
                    padding: sidebarOpen ? "13px 18px" : "12px 8px",
                    borderBottom: `1px solid ${COLORS.border}`,
                    cursor: "pointer",
                    fontWeight: editingNote && editingNote.id === note.id ? 700 : 500,
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    color: "#23214B",
                    transition: "background 0.2s"
                  }}
                  title={note.title}
                >
                  <span style={{
                    fontWeight: 700,
                    color: COLORS.primary,
                    fontSize: 15
                  }}>{sidebarOpen ? note.title : note.title.slice(0, 1)}</span>
                  {sidebarOpen && (
                    <span style={{ display: "block", fontSize: 12, color: "#8792A2", marginTop: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                      {note.content.replace(/\n/g, " ").slice(0, 45) + (note.content.length > 45 ? "..." : "")}
                    </span>
                  )}
                  <button
                    style={{
                      float: "right",
                      background: "none",
                      border: "none",
                      color: "#E34E2B",
                      fontWeight: 600,
                      fontSize: sidebarOpen ? 13 : 18,
                      cursor: "pointer",
                      marginLeft: 11,
                      marginTop: -4,
                      padding: 0
                    }}
                    title="Delete note"
                    tabIndex={-1}
                    onClick={e => { e.stopPropagation(); handleDeleteNote(note.id); }}
                  >✖</button>
                  <button
                    style={{
                      float: "right",
                      background: "none",
                      border: "none",
                      color: COLORS.secondary,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontSize: sidebarOpen ? 13 : 17,
                      marginLeft: 7,
                      marginTop: -4,
                      padding: 0
                    }}
                    title="Edit note"
                    tabIndex={-1}
                    onClick={e => { e.stopPropagation(); handleEditNote(note); }}
                  >✎</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </nav>
      {/* Main Area */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh"
      }}>
        {/* Header bar */}
        <header style={{
          display: "flex",
          alignItems: "center",
          height: 64,
          borderBottom: `1px solid ${COLORS.border}`,
          background: "#fff",
          paddingLeft: 24,
          paddingRight: 16,
          justifyContent: "space-between"
        }}>
          <div>
            <span style={{ color: COLORS.primary, fontWeight: 900, fontSize: 21 }}>Personal Notes</span>
            <span style={{
              background: COLORS.accent,
              color: "#fff",
              borderRadius: "9px",
              padding: "2px 11px",
              marginLeft: 10,
              fontSize: 13,
              fontWeight: 700
            }}>
              Beta
            </span>
          </div>
          <div>
            <span style={{
              marginRight: 14,
              color: "#6366F1",
              fontSize: 15,
              fontWeight: 500
            }}>Hi, {user ? user.username : ""}</span>
            <button
              onClick={handleLogout}
              style={{
                background: COLORS.secondary,
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "8px 16px",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              Logout
            </button>
          </div>
        </header>
        {/* Main content area */}
        <main style={{
          flex: 1,
          padding: 0,
          background: "#F5F7FC",
          minHeight: 0,
          overflow: "auto",
          position: "relative"
        }}>
          <div style={{
            maxWidth: 810,
            margin: "32px auto 0 auto",
            boxShadow: "0 2px 18px #29348109",
            borderRadius: 21,
            background: "#fff",
            padding: 33,
            minHeight: 320,
            minWidth: 290
          }}>
            {noteError && (
              <div style={{ color: "#BF2626", marginBottom: 16 }}>{noteError}</div>
            )}
            {editingNote ? (
              <form onSubmit={handleSaveNote}>
                <h2 style={{ color: COLORS.primary, marginBottom: 10 }}>
                  {editingNote.id ? "Edit Note" : "New Note"}
                </h2>
                <label style={{ display: "block", fontWeight: 600, marginBottom: 7, color: COLORS.secondary }}>
                  Title
                  <input
                    type="text"
                    value={editingNote.title}
                    autoFocus
                    minLength={1}
                    maxLength={128}
                    onChange={e => setEditingNote({ ...editingNote, title: e.target.value })}
                    style={{
                      width: "100%",
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 7,
                      padding: "10px 13px",
                      fontSize: 18,
                      marginTop: 3,
                      marginBottom: 13
                    }}
                    placeholder="Note title"
                    required
                  />
                </label>
                <label style={{ display: "block", fontWeight: 400, color: "#777" }}>
                  Content
                  <textarea
                    required
                    rows={7}
                    value={editingNote.content}
                    onChange={e => setEditingNote({ ...editingNote, content: e.target.value })}
                    style={{
                      width: "100%",
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 7,
                      padding: "10px 13px",
                      fontSize: 16,
                      marginTop: 3,
                      marginBottom: 18
                    }}
                    placeholder="Type your note here..."
                  />
                </label>
                <div>
                  <button
                    type="submit"
                    style={{
                      background: `linear-gradient(80deg, ${COLORS.primary}, ${COLORS.accent})`,
                      color: "#fff",
                      border: "none",
                      borderRadius: 7,
                      padding: "12px 28px",
                      fontWeight: 700,
                      fontSize: 17,
                      marginRight: 12,
                      cursor: "pointer",
                      marginBottom: 8
                    }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingNote(null)}
                    style={{
                      background: COLORS.border,
                      color: COLORS.secondary,
                      border: "none",
                      borderRadius: 7,
                      padding: "12px 24px",
                      fontWeight: 600,
                      fontSize: 16,
                      marginLeft: 2,
                      cursor: "pointer",
                      marginBottom: 8
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : selectedNote ? (
              <div>
                <h2 style={{ color: COLORS.primary, marginBottom: 6, fontWeight: 700 }}>{selectedNote.title}</h2>
                <div style={{
                  color: "#6366F1",
                  fontWeight: 600,
                  marginBottom: 16,
                  fontSize: 14
                }}>
                  Last updated: {selectedNote.updated_at ? new Date(selectedNote.updated_at).toLocaleString() : "unknown"}
                </div>
                <div style={{
                  fontSize: 16,
                  color: "#393951",
                  minHeight: 60,
                  whiteSpace: "pre-line"
                }}>
                  {selectedNote.content}
                </div>
              </div>
            ) : (
              <div style={{
                color: COLORS.secondary,
                fontWeight: 500,
                textAlign: "center",
                fontSize: 22,
                letterSpacing: "-0.01em",
                marginTop: 45,
                minHeight: 90
              }}>
                {notes.length ? "Select a note to view it" : "No notes to show"}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
