-- bldbusiness — Data Tier Schema
-- Run on MySQL 8.0 (data-tier EC2 instance or docker data-tier service)

CREATE DATABASE IF NOT EXISTS bldbusiness
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE bldbusiness;

CREATE USER IF NOT EXISTS 'appuser'@'%' IDENTIFIED BY 'apppass';
GRANT SELECT, INSERT, UPDATE, DELETE ON bldbusiness.* TO 'appuser'@'%';
FLUSH PRIVILEGES;

-- App users (authentication)
CREATE TABLE IF NOT EXISTS user (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  passwordHash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Agents (real estate agents)
CREATE TABLE IF NOT EXISTS agent (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  phone VARCHAR(30),
  licenseNumber VARCHAR(50),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Properties (houses for sale)
CREATE TABLE IF NOT EXISTS property (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  address VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(50) NOT NULL,
  zipCode VARCHAR(20) NOT NULL,
  price DECIMAL(12, 2) NOT NULL,
  bedrooms INT NOT NULL DEFAULT 0,
  bathrooms DECIMAL(3, 1) NOT NULL DEFAULT 0,
  sqft INT NOT NULL DEFAULT 0,
  status ENUM('available', 'pending', 'sold') NOT NULL DEFAULT 'available',
  description TEXT,
  agentId INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_property_agent FOREIGN KEY (agentId) REFERENCES agent(id) ON DELETE SET NULL
);

-- Seed data (default login: admin@bldbusiness.com / admin123)
INSERT INTO user (name, email, passwordHash, role) VALUES
  ('Admin User', 'admin@bldbusiness.com', '$2b$10$30ThZbu12M5lMYKJVBr2UOBAtvxelx17pJsUA36m2DW8WjjRn09Z2', 'admin');

INSERT INTO agent (name, email, phone, licenseNumber) VALUES
  ('Sarah Mitchell', 'sarah.mitchell@bldbusiness.com', '+1-555-0101', 'RE-10001'),
  ('James Chen', 'james.chen@bldbusiness.com', '+1-555-0102', 'RE-10002'),
  ('Maria Lopez', 'maria.lopez@bldbusiness.com', '+1-555-0103', 'RE-10003');

INSERT INTO property (title, address, city, state, zipCode, price, bedrooms, bathrooms, sqft, status, description, agentId) VALUES
  ('Modern Family Home', '742 Oak Street', 'Austin', 'TX', '78701', 485000.00, 4, 3.0, 2400, 'available', 'Spacious open-plan home with updated kitchen and backyard patio.', 1),
  ('Downtown Loft', '1200 Congress Ave Unit 8B', 'Austin', 'TX', '78701', 325000.00, 2, 2.0, 1100, 'pending', 'Urban loft with skyline views and walkable amenities.', 2),
  ('Lakeview Estate', '88 Lakeshore Drive', 'Round Rock', 'TX', '78664', 725000.00, 5, 4.5, 3800, 'available', 'Premium lakefront property with pool and three-car garage.', 3),
  ('Starter Bungalow', '45 Maple Lane', 'Georgetown', 'TX', '78626', 265000.00, 3, 2.0, 1450, 'sold', 'Charming bungalow ideal for first-time buyers.', 1);
