import { useEffect, useState } from "react";

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

async function readErrorMessage(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const data = await response.json();
    if (typeof data === "string") return data;
    if (data?.message) return data.message;
    return JSON.stringify(data);
  }

  const text = await response.text();
  return text || "Something went wrong.";
}

export default function App() {
  const [stocks, setStocks] = useState([]);
  const [selectedStockId, setSelectedStockId] = useState(null);
  const [filters, setFilters] = useState({ symbol: "", companyName: "" });
  const [loadingStocks, setLoadingStocks] = useState(false);
  const [stockError, setStockError] = useState("");

  const [registerForm, setRegisterForm] = useState(emptyRegisterForm);
  const [registerStatus, setRegisterStatus] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);

  const [stockForm, setStockForm] = useState(emptyStockForm);
  const [stockStatus, setStockStatus] = useState("");
  const [stockLoading, setStockLoading] = useState(false);
  const [editingStockId, setEditingStockId] = useState(null);

  const [commentForm, setCommentForm] = useState(emptyCommentForm);
  const [commentStatus, setCommentStatus] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);

  const selectedStock = stocks.find((stock) => stock.id === selectedStockId) ?? null;

  async function loadStocks(nextFilters = filters, preferredStockId = null) {
    setLoadingStocks(true);
    setStockError("");

    try {
      const params = new URLSearchParams();
      if (nextFilters.symbol.trim()) params.set("symbol", nextFilters.symbol.trim());
      if (nextFilters.companyName.trim()) {
        params.set("companyName", nextFilters.companyName.trim());
      }

      const url = params.toString() ? `/api/stock?${params.toString()}` : "/api/stock";
      const response = await fetch(url);

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
      setStockError(error.message);
      setStocks([]);
      setSelectedStockId(null);
    } finally {
      setLoadingStocks(false);
    }
  }

  useEffect(() => {
    loadStocks();
  }, []);

  function resetStockEditor() {
    setEditingStockId(null);
    setStockForm(emptyStockForm);
  }

  function resetCommentEditor() {
    setEditingCommentId(null);
    setCommentForm(emptyCommentForm);
  }

  async function handleRegisterSubmit(event) {
    event.preventDefault();
    setRegisterLoading(true);
    setRegisterStatus("");

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

      const data = await response.text();
      setRegisterStatus(data || "User created successfully.");
      setRegisterForm(emptyRegisterForm);
    } catch (error) {
      setRegisterStatus(error.message);
    } finally {
      setRegisterLoading(false);
    }
  }

  async function handleStockSubmit(event) {
    event.preventDefault();
    setStockLoading(true);
    setStockStatus("");

    try {
      const response = await fetch(
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
      setStockStatus(error.message);
    } finally {
      setStockLoading(false);
    }
  }

  async function handleDeleteStock() {
    if (!selectedStock) {
      setStockStatus("Select a stock first.");
      return;
    }

    if (!window.confirm(`Delete ${selectedStock.symbol}?`)) {
      return;
    }

    setStockLoading(true);
    setStockStatus("");

    try {
      const response = await fetch(`/api/stock/${selectedStock.id}`, {
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
      setStockStatus(error.message);
    } finally {
      setStockLoading(false);
    }
  }

  async function handleCommentSubmit(event) {
    event.preventDefault();

    if (!selectedStock) {
      setCommentStatus("Select a stock first.");
      return;
    }

    setCommentLoading(true);
    setCommentStatus("");

    try {
      const response = await fetch(
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
      setCommentStatus(error.message);
    } finally {
      setCommentLoading(false);
    }
  }

  async function handleDeleteComment(commentId) {
    if (!selectedStock) {
      setCommentStatus("Select a stock first.");
      return;
    }

    if (!window.confirm("Delete this comment?")) {
      return;
    }

    setCommentLoading(true);
    setCommentStatus("");

    try {
      const response = await fetch(`/api/comment/${commentId}`, {
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
      setCommentStatus(error.message);
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
      setStockStatus("Select a stock first.");
      return;
    }

    setEditingStockId(selectedStock.id);
    setStockForm(mapStockToForm(selectedStock));
    setStockStatus("");
  }

  function startEditComment(comment) {
    setEditingCommentId(comment.id);
    setCommentForm({
      title: comment.title,
      content: comment.content,
    });
    setCommentStatus("");
  }

  return (
    <div className="app-shell">
      <header>
        <h1>FinShark</h1>
        <p>Simple React frontend for stocks, comments, and account registration.</p>
      </header>

      <section className="panel">
        <h2>Register</h2>
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
            {registerLoading ? "Creating..." : "Create User"}
          </button>
        </form>
        {registerStatus ? <p className="status">{registerStatus}</p> : null}
      </section>

      <section className="panel">
        <h2>{editingStockId ? "Edit Stock" : "Add Stock"}</h2>
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
        {stockStatus ? <p className="status">{stockStatus}</p> : null}
      </section>

      <section className="panel">
        <h2>Stocks</h2>
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

        {stockError ? <p className="error">{stockError}</p> : null}

        <div className="content-grid">
          <div className="list-panel">
            <h3>All Stocks</h3>
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
            <h3>Details</h3>
            {selectedStock ? (
              <>
                <div className="stock-card">
                  <p><strong>Symbol:</strong> {selectedStock.symbol}</p>
                  <p><strong>Company:</strong> {selectedStock.companyName}</p>
                  <p><strong>Industry:</strong> {selectedStock.industry}</p>
                  <p><strong>Purchase:</strong> {selectedStock.purchase}</p>
                  <p><strong>Last Dividend:</strong> {selectedStock.lastDiv}</p>
                  <p><strong>Market Cap:</strong> {selectedStock.marketCap}</p>
                </div>

                <div className="section-header">
                  <h4>Comments</h4>
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

                <h4>{editingCommentId ? "Edit Comment" : "Add Comment"}</h4>
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
                      {commentLoading ? "Saving..." : editingCommentId ? "Update Comment" : "Add Comment"}
                    </button>
                    <button type="button" onClick={resetCommentEditor}>
                      Clear
                    </button>
                  </div>
                </form>
                {commentStatus ? <p className="status">{commentStatus}</p> : null}
              </>
            ) : (
              <p>Select a stock to view its details.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
