package com.markettrack;

import com.markettrack.model.Product;
import com.markettrack.repository.ProductRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class MarketTrackApplication {

    public static void main(String[] args) {
        SpringApplication.run(MarketTrackApplication.class, args);
        System.out.println("=================================================");
        System.out.println(" MarketTrack Application Started Successfully!   ");
        System.out.println(" Dashboard URL: http://localhost:8080            ");
        System.out.println(" H2 Console:    http://localhost:8080/h2-console ");
        System.out.println("=================================================");
    }

    /**
     * Seeds initial sample inventory records if the database is currently empty.
     * This ensures the dashboard charts and KPI cards populate immediately on first run.
     */
    @Bean
    CommandLineRunner initDatabase(ProductRepository repository) {
        return args -> {
            if (repository.count() == 0) {
                repository.save(new Product("Ergonomic Wireless Mouse", 15.00, 32.50, 45, 38)); // Remaining: 7
                repository.save(new Product("Mechanical Gaming Keyboard", 40.00, 79.99, 30, 27)); // Remaining: 3 (LOW STOCK ALERT)
                repository.save(new Product("USB-C Multiport Hub", 18.50, 39.00, 50, 20));       // Remaining: 30
                repository.save(new Product("Noise Cancelling Headphones", 65.00, 129.99, 25, 23)); // Remaining: 2 (LOW STOCK ALERT)
                repository.save(new Product("4K Ultra HD Webcam", 35.00, 69.50, 40, 15));        // Remaining: 25
                System.out.println("MarketTrack: Pre-seeded 5 sample products for demo analytics.");
            }
        };
    }
}

