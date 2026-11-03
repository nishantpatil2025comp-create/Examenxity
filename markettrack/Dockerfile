# Multi-stage Dockerfile for Spring Boot 3 & Java 25
# Stage 1: Build the Maven application
FROM maven:3.9.15-eclipse-temurin-25 AS builder
WORKDIR /app
COPY pom.xml .
# Download dependencies in a separate layer to leverage Docker cache
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Minimal runtime image
FROM eclipse-temurin:25-jre-alpine
WORKDIR /app
# Ensure persistent data directory exists
RUN mkdir -p /app/data
COPY --from=builder /app/target/markettrack-1.0.0.jar app.jar

# Render assigns dynamic PORT environment variable (default 8080)
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
