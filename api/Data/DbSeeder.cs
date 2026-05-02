using api.Models;
using Microsoft.EntityFrameworkCore;

namespace api.Data
{
    public static class DbSeeder
    {
        public static async Task SeedAsync(ApplicationDbContext context)
        {
            await context.Database.EnsureCreatedAsync();

            var seedTime = DateTime.UtcNow;
            var stockTemplates = new List<Stock>
            {
                new() { Symbol = "AAPL", CompanyName = "Apple Inc.", Purchase = 189.45m, LastDiv = 0.24m, Industry = "Consumer Electronics", MarketCap = 2890000000000 },
                new() { Symbol = "MSFT", CompanyName = "Microsoft Corporation", Purchase = 412.30m, LastDiv = 0.75m, Industry = "Software", MarketCap = 3110000000000 },
                new() { Symbol = "GOOGL", CompanyName = "Alphabet Inc.", Purchase = 168.75m, LastDiv = 0.00m, Industry = "Internet Services", MarketCap = 2050000000000 },
                new() { Symbol = "AMZN", CompanyName = "Amazon.com Inc.", Purchase = 182.10m, LastDiv = 0.00m, Industry = "E-Commerce", MarketCap = 1960000000000 },
                new() { Symbol = "NVDA", CompanyName = "NVIDIA Corporation", Purchase = 932.80m, LastDiv = 0.04m, Industry = "Semiconductors", MarketCap = 2280000000000 },
                new() { Symbol = "META", CompanyName = "Meta Platforms Inc.", Purchase = 498.20m, LastDiv = 0.50m, Industry = "Social Media", MarketCap = 1260000000000 },
                new() { Symbol = "TSLA", CompanyName = "Tesla Inc.", Purchase = 178.90m, LastDiv = 0.00m, Industry = "Automotive", MarketCap = 572000000000 },
                new() { Symbol = "BRK.B", CompanyName = "Berkshire Hathaway Inc.", Purchase = 418.35m, LastDiv = 0.00m, Industry = "Conglomerate", MarketCap = 906000000000 },
                new() { Symbol = "JPM", CompanyName = "JPMorgan Chase & Co.", Purchase = 197.55m, LastDiv = 1.15m, Industry = "Banking", MarketCap = 566000000000 },
                new() { Symbol = "V", CompanyName = "Visa Inc.", Purchase = 276.90m, LastDiv = 0.52m, Industry = "Payments", MarketCap = 558000000000 },
                new() { Symbol = "WMT", CompanyName = "Walmart Inc.", Purchase = 66.45m, LastDiv = 0.21m, Industry = "Retail", MarketCap = 532000000000 },
                new() { Symbol = "LLY", CompanyName = "Eli Lilly and Company", Purchase = 781.25m, LastDiv = 1.30m, Industry = "Pharmaceuticals", MarketCap = 741000000000 },
                new() { Symbol = "MA", CompanyName = "Mastercard Incorporated", Purchase = 463.40m, LastDiv = 0.66m, Industry = "Payments", MarketCap = 432000000000 },
                new() { Symbol = "NFLX", CompanyName = "Netflix Inc.", Purchase = 627.15m, LastDiv = 0.00m, Industry = "Streaming", MarketCap = 269000000000 },
                new() { Symbol = "COST", CompanyName = "Costco Wholesale Corporation", Purchase = 725.60m, LastDiv = 1.16m, Industry = "Retail", MarketCap = 322000000000 },
                new() { Symbol = "DIS", CompanyName = "The Walt Disney Company", Purchase = 112.80m, LastDiv = 0.00m, Industry = "Entertainment", MarketCap = 206000000000 },
                new() { Symbol = "ADBE", CompanyName = "Adobe Inc.", Purchase = 486.70m, LastDiv = 0.00m, Industry = "Software", MarketCap = 220000000000 },
                new() { Symbol = "CRM", CompanyName = "Salesforce Inc.", Purchase = 294.15m, LastDiv = 0.40m, Industry = "Cloud Software", MarketCap = 287000000000 },
                new() { Symbol = "AMD", CompanyName = "Advanced Micro Devices Inc.", Purchase = 154.35m, LastDiv = 0.00m, Industry = "Semiconductors", MarketCap = 258000000000 },
                new() { Symbol = "INTC", CompanyName = "Intel Corporation", Purchase = 34.20m, LastDiv = 0.13m, Industry = "Semiconductors", MarketCap = 147000000000 },
                new() { Symbol = "ORCL", CompanyName = "Oracle Corporation", Purchase = 126.85m, LastDiv = 0.40m, Industry = "Software", MarketCap = 356000000000 },
                new() { Symbol = "PEP", CompanyName = "PepsiCo Inc.", Purchase = 171.55m, LastDiv = 1.35m, Industry = "Beverages", MarketCap = 242000000000 },
                new() { Symbol = "KO", CompanyName = "The Coca-Cola Company", Purchase = 62.90m, LastDiv = 0.49m, Industry = "Beverages", MarketCap = 271000000000 },
                new() { Symbol = "NKE", CompanyName = "NIKE Inc.", Purchase = 98.75m, LastDiv = 0.37m, Industry = "Apparel", MarketCap = 146000000000 },
                new() { Symbol = "UBER", CompanyName = "Uber Technologies Inc.", Purchase = 76.20m, LastDiv = 0.00m, Industry = "Mobility", MarketCap = 162000000000 }
            };

            var existingSymbols = await context.Stocks
                .Select(stock => stock.Symbol)
                .ToListAsync();
            var existingSymbolSet = existingSymbols
                .ToHashSet(StringComparer.OrdinalIgnoreCase);
            var currentStockCount = existingSymbols.Count;

            var stocks = stockTemplates
                .Where(stock => !existingSymbolSet.Contains(stock.Symbol))
                .Take(Math.Max(0, 25 - currentStockCount))
                .ToList();

            if (stocks.Count > 0)
            {
                await context.Stocks.AddRangeAsync(stocks);
                await context.SaveChangesAsync();
            }

            var commentCount = await context.Comments.CountAsync();
            if (commentCount >= 50)
            {
                return;
            }

            var stocksForComments = await context.Stocks
                .OrderBy(stock => stock.Id)
                .Take(25)
                .ToListAsync();

            if (stocksForComments.Count == 0)
            {
                return;
            }

            var comments = new List<Comment>();
            for (var i = commentCount; i < 50; i++)
            {
                var stock = stocksForComments[i % stocksForComments.Count];
                comments.Add(new Comment
                {
                    Title = i % 2 == 0 ? $"{stock.Symbol} outlook" : $"{stock.Symbol} valuation note",
                    Content = i % 2 == 0
                        ? $"{stock.CompanyName} has steady investor interest and solid sector positioning."
                        : $"Tracking {stock.Symbol} for entry opportunities based on earnings momentum and market cap trends.",
                    CreatedOn = seedTime.AddMinutes(-(i + 1) * 15),
                    StockId = stock.Id
                });
            }

            await context.Comments.AddRangeAsync(comments);
            await context.SaveChangesAsync();
        }
    }
}
