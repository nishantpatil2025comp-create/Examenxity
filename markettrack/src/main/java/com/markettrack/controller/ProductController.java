package com.markettrack.controller;

import com.markettrack.model.Product;
import com.markettrack.repository.ProductRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/products")
@CrossOrigin(origins = "*")
public class ProductController {

    private final ProductRepository productRepository;

    public ProductController(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    /**
     * GET /api/products
     * Fetches all products, with optional keyword filtering.
     */
    @GetMapping
    public ResponseEntity<List<Product>> getAllProducts(@RequestParam(required = false) String search) {
        List<Product> products;
        if (search != null && !search.trim().isEmpty()) {
            products = productRepository.findByNameContainingIgnoreCase(search.trim());
        } else {
            products = productRepository.findAllByOrderByIdDesc();
        }
        return ResponseEntity.ok(products);
    }

    /**
     * GET /api/products/{id}
     * Fetches a single product by its ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<Product> getProductById(@PathVariable Long id) {
        return productRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * POST /api/products
     * Creates a new product in inventory.
     */
    @PostMapping
    public ResponseEntity<?> createProduct(@Valid @RequestBody Product product) {
        try {
            // Ensure ID is null for new entity creation
            product.setId(null);
            Product savedProduct = productRepository.save(product);
            return ResponseEntity.status(HttpStatus.CREATED).body(savedProduct);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to create product: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }

    /**
     * PUT /api/products/{id}
     * Updates an existing product's details.
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateProduct(@PathVariable Long id, @Valid @RequestBody Product updatedData) {
        return productRepository.findById(id).map(existingProduct -> {
            existingProduct.setName(updatedData.getName());
            existingProduct.setPurchasePrice(updatedData.getPurchasePrice());
            existingProduct.setSellingPrice(updatedData.getSellingPrice());
            existingProduct.setInitialStock(updatedData.getInitialStock());
            existingProduct.setSoldQuantity(updatedData.getSoldQuantity());

            Product saved = productRepository.save(existingProduct);
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    /**
     * DELETE /api/products/{id}
     * Deletes a product from the database.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProduct(@PathVariable Long id) {
        return productRepository.findById(id).map(product -> {
            productRepository.delete(product);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Product '" + product.getName() + "' deleted successfully.");
            return ResponseEntity.ok(response);
        }).orElse(ResponseEntity.notFound().build());
    }

    /**
     * GET /api/products/summary
     * Computes aggregate business KPI metrics across the entire product catalog.
     */
    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getInventorySummary() {
        List<Product> products = productRepository.findAll();

        double totalRevenue = products.stream().mapToDouble(Product::getSalesRevenue).sum();
        double totalProfit = products.stream().mapToDouble(Product::getNetProfit).sum();
        double totalInventoryValue = products.stream().mapToDouble(Product::getInventoryValue).sum();
        long lowStockCount = products.stream().filter(Product::isLowStock).count();

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalProducts", products.size());
        summary.put("totalRevenue", round(totalRevenue));
        summary.put("totalProfit", round(totalProfit));
        summary.put("totalInventoryValue", round(totalInventoryValue));
        summary.put("lowStockCount", lowStockCount);

        return ResponseEntity.ok(summary);
    }

    private double round(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }
}

