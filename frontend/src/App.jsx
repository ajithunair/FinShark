import { useEffect, useState } from "react";

const emptyRegisterForm = {
  username: "",
  email: "",
  password: "",
};

const emptyCommentForm = {
  title: "",
  content: "",
};

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
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
  const [selectedStock, setSelectedStock] = useState(null);
  const [filters, setFilters] = useState({ symbol: "", companyName: "" });
  const [loadingStocks, setLoadingStocks] = useState(false);
  const [stockError, setStockError] = useState("");

  const [registerForm, setRegisterForm] = useState(emptyRegisterForm);
  const [registerStatus, setRegisterStatus] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);

  const [commentForm, setCommentForm] = useState(emptyCommentForm);
  const [commentStatus, setCommentStatus] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  async function loadStocks(nextFilters = filters) {
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
      setSelectedStock((current) => {
        if (!current) return data[0] ?? null;
        return data.find((stock) => stock.id === current.id) ?? data[0] ?? null;
      });
    } catch (error) {
      setStockError(error.message);
      setStocks([]);
      setSelectedStock(null);
    } finally {
      setLoadingStocks(false);
    }
  }

  useEffect(() => {
    loadStocks();
  }, []);

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

  async function handleCommentSubmit(event) {
    event.preventDefault();

    if (!selectedStock) {
      setCommentStatus("Select a stock first.");
      return;
    }

    setCommentLoading(true);
    setCommentStatus("");

    try {
      const response = await fetch(`/api/comment/${selectedStock.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(commentForm),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const createdComment = await response.json();
      setSelectedStock((current) =>
        current
          ? {
              ...current,
              comments: [...(current.comments ?? []), createdComment],
            }
          : current
      );
      setCommentForm(emptyCommentForm);
      setCommentStatus("Comment added.");
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

  function handleCommentChange(event) {
    const { name, value } = event.target;
    setCommentForm((current) => ({
      ...current,
      [name]: value,
    }));
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
                    className={selectedStock?.id === stock.id ? "active" : ""}
                    onClick={() => setSelectedStock(stock)}
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

                <h4>Comments</h4>
                <ul className="comment-list">
                  {(selectedStock.comments ?? []).map((comment) => (
                    <li key={comment.id}>
                      <strong>{comment.title}</strong>
                      <p>{comment.content}</p>
                      <small>{formatDate(comment.createdOn)}</small>
                    </li>
                  ))}
                </ul>
                {(selectedStock.comments ?? []).length === 0 ? <p>No comments yet.</p> : null}

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
                  <button type="submit" disabled={commentLoading}>
                    {commentLoading ? "Saving..." : "Add Comment"}
                  </button>
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
