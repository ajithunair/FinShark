import { useEffect, useState } from "react";

const SESSION_STORAGE_KEY = "finshark-session";

const emptyLoginForm = {
  username: "",
  password: "",
};

const emptyRegisterForm = {
  username: "",
  email: "",
  password: "",
};

const emptyStockForm = {
  symbol: "",
  companyName: "",
  purchase: "",
  lastDiv: "",
  industry: "",
  marketCap: "",
};

const emptyCommentForm = {
  title: "",
  content: "",
};

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function mapStockToForm(stock) {
  return {
    symbol: stock.symbol ?? "",
    companyName: stock.companyName ?? "",
    purchase: String(stock.purchase ?? ""),
    lastDiv: String(stock.lastDiv ?? ""),
    industry: stock.industry ?? "",
    marketCap: String(stock.marketCap ?? ""),
  };
}

function mapStockFormToPayload(stockForm) {
  return {
    symbol: stockForm.symbol.trim(),
    companyName: stockForm.companyName.trim(),
    purchase: Number(stockForm.purchase),
    lastDiv: Number(stockForm.lastDiv),
    industry: stockForm.industry.trim(),
    marketCap: Number(stockForm.marketCap),
  };
}

function readStoredSession() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return rawValue ? JSON.parse(rawValue) : null;
  } catch {
    return null;
  }
}

async function readErrorMessage(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const data = await response.json();

    if (typeof data === "string") return data;
    if (data?.message) return data.message;

    if (Array.isArray(data)) {
      return data
        .map((item) => item?.description || item?.message || JSON.stringify(item))
        .join(", ");
    }

    const firstValue = Object.values(data ?? {})[0];
    if (Array.isArray(firstValue)) {
      return firstValue.join(", ");
    }

    return JSON.stringify(data);
  }

  const text = await response.text();
  if (!text && response.status === 401) {
    return "Unauthorized. Please log in again.";
  }

  return text || "Something went wrong.";
}

function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;

  return (
    <div className="error-banner" role="alert">
      <span>{message}</span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss error">
        Dismiss
      </button>
    </div>
  );
}

export default function App() {
  const initialSession = readStoredSession();

  const [activeView, setActiveView] = useState(initialSession ? "stocks" : "login");
  const [session, setSession] = useState(initialSession);
  const [errorBanner, setErrorBanner] = useState("");

  const [loginForm, setLoginForm] = useState(emptyLoginForm);
  const [loginStatus, setLoginStatus] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [registerForm, setRegisterForm] = useState(emptyRegisterForm);
  const [registerStatus, setRegisterStatus] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);

  const [stocks, setStocks] = useState([]);
  const [selectedStockId, setSelectedStockId] = useState(null);
  const [filters, setFilters] = useState({ symbol: "", companyName: "" });
  const [loadingStocks, setLoadingStocks] = useState(false);
  const [stockStatus, setStockStatus] = useState("");

  const [stockForm, setStockForm] = useState(emptyStockForm);
  const [stockLoading, setStockLoading] = useState(false);
  const [editingStockId, setEditingStockId] = useState(null);

  const [commentForm, setCommentForm] = useState(emptyCommentForm);
  const [commentStatus, setCommentStatus] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);

  const selectedStock = stocks.find((stock) => stock.id === selectedStockId) ?? null;

  function clearErrorBanner() {
    setErrorBanner("");
  }

  function showError(message) {
    setErrorBanner(message || "Something went wrong.");
  }

  async function fetchWithAuth(url, options = {}) {
    const headers = new Headers(options.headers || {});

    if (session?.token) {
      headers.set("Authorization", `Bearer ${session.token}`);
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      setSession(null);
      setActiveView("login");
      setLoginStatus("Your session expired. Please log in again.");
    }

    return response;
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (session) {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [session]);

  async function loadStocks(nextFilters = filters, preferredStockId = null) {
    setLoadingStocks(true);

    try {
      const params = new URLSearchParams();
      if (nextFilters.symbol.trim()) params.set("symbol", nextFilters.symbol.trim());
      if (nextFilters.companyName.trim()) {
        params.set("companyName", nextFilters.companyName.trim());
      }

      const url = params.toString() ? `/api/stock?${params.toString()}` : "/api/stock";
      const response = await fetchWithAuth(url);

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const data = await response.json();
      setStocks(data);
      setSelectedStockId((currentId) => {
        const nextSelectedId = preferredStockId ?? currentId;
        if (nextSelectedId && data.some((stock) => stock.id === nextSelectedId)) {
          return nextSelectedId;
        }

        return data[0]?.id ?? null;
      });
    } catch (error) {
      showError(error.message);
      setStocks([]);
      setSelectedStockId(null);
    } finally {
      setLoadingStocks(false);
    }
  }

  useEffect(() => {
    if (activeView === "stocks" && session) {
      loadStocks();
    }
  }, [activeView, session]);

  function resetStockEditor() {
    setEditingStockId(null);
    setStockForm(emptyStockForm);
  }

  function resetCommentEditor() {
    setEditingCommentId(null);
    setCommentForm(emptyCommentForm);
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();
    setLoginLoading(true);
    setLoginStatus("");
    clearErrorBanner();

    try {
      const response = await fetch("/api/account/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginForm),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const data = await response.json();
      setSession(data);
      setLoginStatus(`Welcome back, ${data.userName}.`);
      setLoginForm(emptyLoginForm);
      setActiveView("stocks");
    } catch (error) {
      showError(error.message);
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleRegisterSubmit(event) {
    event.preventDefault();
    setRegisterLoading(true);
    setRegisterStatus("");
    clearErrorBanner();

    try {
      const response = await fetch("/api/account/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registerForm),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      await response.json();
      setRegisterStatus("Account created. You can log in now.");
      setLoginForm({
        username: registerForm.username,
        password: "",
      });
      setRegisterForm(emptyRegisterForm);
      setActiveView("login");
    } catch (error) {
      showError(error.message);
    } finally {
      setRegisterLoading(false);
    }
  }

  async function handleStockSubmit(event) {
    event.preventDefault();
    setStockLoading(true);
    setStockStatus("");
    clearErrorBanner();

    try {
      const response = await fetchWithAuth(
        editingStockId ? `/api/stock/${editingStockId}` : "/api/stock",
        {
          method: editingStockId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(mapStockFormToPayload(stockForm)),
        }
      );

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const savedStock = await response.json();
      await loadStocks(filters, savedStock.id);
      setStockStatus(editingStockId ? "Stock updated." : "Stock created.");
      resetStockEditor();
    } catch (error) {
      showError(error.message);
    } finally {
      setStockLoading(false);
    }
  }

  async function handleDeleteStock() {
    if (!selectedStock) {
      showError("Select a stock first.");
      return;
    }

    if (!window.confirm(`Delete ${selectedStock.symbol}?`)) {
      return;
    }

    setStockLoading(true);
    setStockStatus("");
    clearErrorBanner();

    try {
      const response = await fetchWithAuth(`/api/stock/${selectedStock.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      await loadStocks(filters);
      setStockStatus("Stock deleted.");
      resetStockEditor();
      resetCommentEditor();
    } catch (error) {
      showError(error.message);
    } finally {
      setStockLoading(false);
    }
  }

  async function handleCommentSubmit(event) {
    event.preventDefault();

    if (!selectedStock) {
      showError("Select a stock first.");
      return;
    }

    setCommentLoading(true);
    setCommentStatus("");
    clearErrorBanner();

    try {
      const response = await fetchWithAuth(
        editingCommentId ? `/api/comment/${editingCommentId}` : `/api/comment/${selectedStock.id}`,
        {
          method: editingCommentId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(commentForm),
        }
      );

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      await loadStocks(filters, selectedStock.id);
      setCommentStatus(editingCommentId ? "Comment updated." : "Comment added.");
      resetCommentEditor();
    } catch (error) {
      showError(error.message);
    } finally {
      setCommentLoading(false);
    }
  }

  async function handleDeleteComment(commentId) {
    if (!selectedStock) {
      showError("Select a stock first.");
      return;
    }

    if (!window.confirm("Delete this comment?")) {
      return;
    }

    setCommentLoading(true);
    setCommentStatus("");
    clearErrorBanner();

    try {
      const response = await fetchWithAuth(`/api/comment/${commentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      await loadStocks(filters, selectedStock.id);
      setCommentStatus("Comment deleted.");

      if (editingCommentId === commentId) {
        resetCommentEditor();
      }
    } catch (error) {
      showError(error.message);
    } finally {
      setCommentLoading(false);
    }
  }

  function handleFilterChange(event) {
    const { name, value } = event.target;
    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleLoginChange(event) {
    const { name, value } = event.target;
    setLoginForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleRegisterChange(event) {
    const { name, value } = event.target;
    setRegisterForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleStockChange(event) {
    const { name, value } = event.target;
    setStockForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleCommentChange(event) {
    const { name, value } = event.target;
    setCommentForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function startEditStock() {
    if (!selectedStock) {
      showError("Select a stock first.");
      return;
    }

    clearErrorBanner();
    setEditingStockId(selectedStock.id);
    setStockForm(mapStockToForm(selectedStock));
    setStockStatus("");
  }

  function startEditComment(comment) {
    clearErrorBanner();
    setEditingCommentId(comment.id);
    setCommentForm({
      title: comment.title,
      content: comment.content,
    });
    setCommentStatus("");
  }

  function handleLogout() {
    setSession(null);
    setActiveView("login");
    setLoginStatus("Signed out.");
    setStocks([]);
    setSelectedStockId(null);
    resetStockEditor();
    resetCommentEditor();
    clearErrorBanner();
  }

  function openView(nextView) {
    if (nextView === "stocks" && !session) {
      showError("Please log in to view stocks.");
      setActiveView("login");
      return;
    }

    clearErrorBanner();
    setActiveView(nextView);
  }

  const navigationItems = [
    { id: "login", label: session ? "Account" : "Login" },
    { id: "register", label: "Register" },
    { id: "stocks", label: "Stocks" },
  ];

  return (
    <div className="app-shell">
      <header className="topbar panel">
        <div>
          <p className="eyebrow">Simple frontend</p>
          <h1>FinShark</h1>
          <p className="subtitle">
            Login, manage stocks, and leave comments from one small dashboard.
          </p>
        </div>

        <div className="topbar-actions">
          <nav className="nav-menu" aria-label="Main navigation">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={activeView === item.id ? "nav-link active" : "nav-link"}
                onClick={() => openView(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {session ? (
            <div className="session-chip">
              <span>{session.userName}</span>
              <button type="button" onClick={handleLogout}>
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <ErrorBanner message={errorBanner} onDismiss={clearErrorBanner} />

      {activeView === "login" ? (
        <section className="login-layout">
          <div className="panel hero-panel">
            <p className="eyebrow">Welcome</p>
            <h2>Login screen</h2>
            <p>
              Keep it simple: sign in first, then use the menu to open stocks or create a new
              account.
            </p>
            {session ? (
              <div className="info-block">
                <strong>Signed in as {session.userName}</strong>
                <p>{session.email}</p>
              </div>
            ) : null}
          </div>

          <section className="panel form-panel">
            <h2>{session ? "Session" : "Login"}</h2>
            <form className="form-grid" onSubmit={handleLoginSubmit}>
              <input
                name="username"
                placeholder="Username"
                value={loginForm.username}
                onChange={handleLoginChange}
              />
              <input
                name="password"
                type="password"
                placeholder="Password"
                value={loginForm.password}
                onChange={handleLoginChange}
              />
              <button type="submit" disabled={loginLoading}>
                {loginLoading ? "Signing in..." : session ? "Switch Account" : "Login"}
              </button>
            </form>
            {loginStatus ? <p className="status-text">{loginStatus}</p> : null}
          </section>
        </section>
      ) : null}

      {activeView === "register" ? (
        <section className="panel form-panel">
          <div className="section-header">
            <div>
              <p className="eyebrow">Account</p>
              <h2>Create a user</h2>
            </div>
          </div>

          <form className="form-grid" onSubmit={handleRegisterSubmit}>
            <input
              name="username"
              placeholder="Username"
              value={registerForm.username}
              onChange={handleRegisterChange}
            />
            <input
              name="email"
              type="email"
              placeholder="Email"
              value={registerForm.email}
              onChange={handleRegisterChange}
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              value={registerForm.password}
              onChange={handleRegisterChange}
            />
            <button type="submit" disabled={registerLoading}>
              {registerLoading ? "Creating..." : "Create Account"}
            </button>
          </form>
          {registerStatus ? <p className="status-text">{registerStatus}</p> : null}
        </section>
      ) : null}

      {activeView === "stocks" ? (
        <div className="dashboard-grid">
          <section className="panel">
            <div className="section-header">
              <div>
                <p className="eyebrow">Stocks</p>
                <h2>{editingStockId ? "Edit stock" : "Add stock"}</h2>
              </div>
            </div>

            <form className="form-grid" onSubmit={handleStockSubmit}>
              <input
                name="symbol"
                placeholder="Symbol"
                value={stockForm.symbol}
                onChange={handleStockChange}
              />
              <input
                name="companyName"
                placeholder="Company name"
                value={stockForm.companyName}
                onChange={handleStockChange}
              />
              <input
                name="industry"
                placeholder="Industry"
                value={stockForm.industry}
                onChange={handleStockChange}
              />
              <input
                name="purchase"
                type="number"
                step="0.01"
                placeholder="Purchase"
                value={stockForm.purchase}
                onChange={handleStockChange}
              />
              <input
                name="lastDiv"
                type="number"
                step="0.01"
                placeholder="Last dividend"
                value={stockForm.lastDiv}
                onChange={handleStockChange}
              />
              <input
                name="marketCap"
                type="number"
                step="1"
                placeholder="Market cap"
                value={stockForm.marketCap}
                onChange={handleStockChange}
              />
              <div className="button-row">
                <button type="submit" disabled={stockLoading}>
                  {stockLoading ? "Saving..." : editingStockId ? "Update Stock" : "Create Stock"}
                </button>
                <button type="button" onClick={resetStockEditor}>
                  Clear
                </button>
                <button type="button" onClick={startEditStock}>
                  Load Selected
                </button>
                <button type="button" onClick={handleDeleteStock}>
                  Delete Selected
                </button>
              </div>
            </form>
            {stockStatus ? <p className="status-text">{stockStatus}</p> : null}
          </section>

          <section className="panel">
            <div className="section-header">
              <div>
                <p className="eyebrow">Browse</p>
                <h2>Stocks list</h2>
              </div>
            </div>

            <form
              className="filter-row"
              onSubmit={(event) => {
                event.preventDefault();
                loadStocks();
              }}
            >
              <input
                name="symbol"
                placeholder="Search by symbol"
                value={filters.symbol}
                onChange={handleFilterChange}
              />
              <input
                name="companyName"
                placeholder="Search by company name"
                value={filters.companyName}
                onChange={handleFilterChange}
              />
              <button type="submit" disabled={loadingStocks}>
                {loadingStocks ? "Loading..." : "Search"}
              </button>
            </form>

            <div className="content-grid">
              <div className="list-panel">
                <ul className="stock-list">
                  {stocks.map((stock) => (
                    <li key={stock.id}>
                      <button
                        type="button"
                        className={selectedStockId === stock.id ? "active" : ""}
                        onClick={() => {
                          setSelectedStockId(stock.id);
                          setCommentStatus("");
                        }}
                      >
                        <strong>{stock.symbol}</strong>
                        <span>{stock.companyName}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                {!loadingStocks && stocks.length === 0 ? <p>No stocks found.</p> : null}
              </div>

              <div className="details-panel">
                {selectedStock ? (
                  <>
                    <div className="stock-card">
                      <h3>{selectedStock.companyName}</h3>
                      <p>
                        <strong>Symbol:</strong> {selectedStock.symbol}
                      </p>
                      <p>
                        <strong>Industry:</strong> {selectedStock.industry}
                      </p>
                      <p>
                        <strong>Purchase:</strong> {selectedStock.purchase}
                      </p>
                      <p>
                        <strong>Last Dividend:</strong> {selectedStock.lastDiv}
                      </p>
                      <p>
                        <strong>Market Cap:</strong> {selectedStock.marketCap}
                      </p>
                    </div>

                    <div className="section-header">
                      <h3>Comments</h3>
                      <button type="button" onClick={resetCommentEditor}>
                        New Comment
                      </button>
                    </div>

                    <ul className="comment-list">
                      {(selectedStock.comments ?? []).map((comment) => (
                        <li key={comment.id}>
                          <strong>{comment.title}</strong>
                          <p>{comment.content}</p>
                          <small>{formatDate(comment.createdOn)}</small>
                          <div className="button-row">
                            <button type="button" onClick={() => startEditComment(comment)}>
                              Edit
                            </button>
                            <button type="button" onClick={() => handleDeleteComment(comment.id)}>
                              Delete
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                    {(selectedStock.comments ?? []).length === 0 ? <p>No comments yet.</p> : null}

                    <h3>{editingCommentId ? "Edit comment" : "Add comment"}</h3>
                    <form className="form-grid" onSubmit={handleCommentSubmit}>
                      <input
                        name="title"
                        placeholder="Comment title"
                        value={commentForm.title}
                        onChange={handleCommentChange}
                      />
                      <textarea
                        name="content"
                        placeholder="Comment content"
                        rows="4"
                        value={commentForm.content}
                        onChange={handleCommentChange}
                      />
                      <div className="button-row">
                        <button type="submit" disabled={commentLoading}>
                          {commentLoading
                            ? "Saving..."
                            : editingCommentId
                              ? "Update Comment"
                              : "Add Comment"}
                        </button>
                        <button type="button" onClick={resetCommentEditor}>
                          Clear
                        </button>
                      </div>
                    </form>
                    {commentStatus ? <p className="status-text">{commentStatus}</p> : null}
                  </>
                ) : (
                  <div className="empty-state">
                    <h3>No stock selected</h3>
                    <p>Select a stock from the menu to view details and comments.</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
