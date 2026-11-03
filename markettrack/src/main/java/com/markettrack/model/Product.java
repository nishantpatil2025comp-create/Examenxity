package com.markettrack.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Product Entity representing inventory items, purchasing & selling prices,
 * and computed business metrics (Remaining Stock, Inventory Value, Sales Revenue, Net Profit).
 */
@Entity
@Table(name = "products")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Product name cannot be empty")
    private String name;

    @NotNull(message = "Purchase price is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Purchase price must be positive")
    private Double purchasePrice;

    @NotNull(message = "Selling price is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Selling price must be positive")
    private Double sellingPrice;

    @NotNull(message = "Initial stock is required")
    @Min(value = "0", message = "Initial stock cannot be negative")
    private Integer initialStock;

    @NotNull(message = "Sold quantity is required")
    @Min(value = "0", message = "Sold quantity cannot be negative")
    private Integer soldQuantity;

    // Default No-Arg Constructor required by JPA
    public Product() {
    }

    // Convenience constructor for seeding and creation
    public Product(String name, Double purchasePrice, Double sellingPrice, Integer initialStock, Integer soldQuantity) {
        this.name = name;
        this.purchasePrice = purchasePrice;
        this.sellingPrice = sellingPrice;
        this.initialStock = initialStock;
        this.soldQuantity = soldQuantity;
    }

    // Full constructor
    public Product(Long id, String name, Double purchasePrice, Double sellingPrice, Integer initialStock, Integer soldQuantity) {
        this.id = id;
        this.name = name;
        this.purchasePrice = purchasePrice;
        this.sellingPrice = sellingPrice;
        this.initialStock = initialStock;
        this.soldQuantity = soldQuantity;
    }

    // ==========================================================
    // Automatic Business Calculation Methods (Transient / Derived)
    // These methods automatically serialize into the JSON response for the frontend.
    // ==========================================================

    /**
     * Remaining Stock = Initial Stock - Sold Quantity
     */
    @Transient
    public Integer getRemainingStock() {
        int initial = (this.initialStock != null) ? this.initialStock : 0;
        int sold = (this.soldQuantity != null) ? this.soldQuantity : 0;
        return Math.max(0, initial - sold);
    }

    /**
     * Total Inventory Value = Remaining Stock * Purchase Price
     */
    @Transient
    public Double getInventoryValue() {
        double cost = (this.purchasePrice != null) ? this.purchasePrice : 0.0;
        return round(getRemainingStock() * cost);
    }

    /**
     * Total Sales Revenue = Sold Quantity * Selling Price
     */
    @Transient
    public Double getSalesRevenue() {
        int sold = (this.soldQuantity != null) ? this.soldQuantity : 0;
        double price = (this.sellingPrice != null) ? this.sellingPrice : 0.0;
        return round(sold * price);
    }

    /**
     * Total Net Profit = Total Sales Revenue - Cost of Goods Sold (Sold Quantity * Purchase Price)
     */
    @Transient
    public Double getNetProfit() {
        int sold = (this.soldQuantity != null) ? this.soldQuantity : 0;
        double sellPrice = (this.sellingPrice != null) ? this.sellingPrice : 0.0;
        double buyPrice = (this.purchasePrice != null) ? this.purchasePrice : 0.0;
        return round(sold * (sellPrice - buyPrice));
    }

    /**
     * Low stock flag: triggers visual alert if remaining stock is under 5 units.
     */
    @Transient
    public boolean isLowStock() {
        return getRemainingStock() < 5;
    }

    /**
     * Profit Margin per Unit = Selling Price - Purchase Price
     */
    @Transient
    public Double getProfitPerUnit() {
        double sellPrice = (this.sellingPrice != null) ? this.sellingPrice : 0.0;
        double buyPrice = (this.purchasePrice != null) ? this.purchasePrice : 0.0;
        return round(sellPrice - buyPrice);
    }

    /**
     * Utility method to round financial values to 2 decimal places
     */
    private double round(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }

    // ==========================================================
    // Standard Getters and Setters
    // ==========================================================

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Double getPurchasePrice() {
        return purchasePrice;
    }

    public void setPurchasePrice(Double purchasePrice) {
        this.purchasePrice = purchasePrice;
    }

    public Double getSellingPrice() {
        return sellingPrice;
    }

    public void setSellingPrice(Double sellingPrice) {
        this.sellingPrice = sellingPrice;
    }

    public Integer getInitialStock() {
        return initialStock;
    }

    public void setInitialStock(Integer initialStock) {
        this.initialStock = initialStock;
    }

    public Integer getSoldQuantity() {
        return soldQuantity;
    }

    public void setSoldQuantity(Integer soldQuantity) {
        this.soldQuantity = soldQuantity;
    }
}

