using api.Data;
using Microsoft.EntityFrameworkCore;

namespace api;

public class Program
{
    public static void Main(string[] args)
    {
        CreateHostBuilder(args).Build().Run();
    }

    public static IHostBuilder CreateHostBuilder(string[] args) =>
        Host.CreateDefaultBuilder(args)
            .ConfigureWebHostDefaults(webBuilder =>
            {
                webBuilder.ConfigureServices((context, services) =>
                {
                    services.AddEndpointsApiExplorer();
                    services.AddSwaggerGen();
                    services.AddDbContext<ApplicationContext>(options =>
                    {
                        options.UseNpgsql(
                            context.Configuration.GetConnectionString("PostgreSqlConnectionString"));
                    });
                });

                webBuilder.Configure((context, app) =>
                {
                    if (context.HostingEnvironment.IsDevelopment())
                    {
                        app.UseSwagger();
                        app.UseSwaggerUI();
                    }

                    app.UseHttpsRedirection();
                });
            });
}
