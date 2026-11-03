package com.markettrack.repository;

import com.markettrack.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    /**
     * Retrieve all products ordered by ID in descending order (newest first).
     */
    List<Product> findAllByOrderByIdDesc();

    /**
     * Search products by keyword in name (case-insensitive).
     */
    List<Product> findByNameContainingIgnoreCase(String keyword);
}

