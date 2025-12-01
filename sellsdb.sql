-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Dec 01, 2025 at 11:32 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.1.25

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `sellsdb`
--

-- --------------------------------------------------------

--
-- Table structure for table `cart`
--

CREATE TABLE `cart` (
  `id` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `productid` varchar(50) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `price` decimal(10,2) NOT NULL,
  `total` decimal(10,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `cart`
--

INSERT INTO `cart` (`id`, `customer_id`, `productid`, `quantity`, `price`, `total`, `created_at`) VALUES
(1, 11, '3', 1, 250000.00, 250000.00, '2025-12-01 09:51:45'),
(2, 11, '4', 1, 260000.00, 260000.00, '2025-12-01 09:52:44');

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `id` int(11) NOT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `reference_id` varchar(100) DEFAULT NULL,
  `external_id` varchar(100) DEFAULT NULL,
  `amount` decimal(12,2) DEFAULT NULL,
  `status` varchar(30) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `productid` int(11) NOT NULL,
  `seller_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(12,2) NOT NULL,
  `quantity` int(11) DEFAULT 1,
  `image_url` varchar(500) DEFAULT NULL,
  `status` varchar(8) DEFAULT '0',
  `is_sold` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`productid`, `seller_id`, `title`, `description`, `price`, `quantity`, `image_url`, `status`, `is_sold`, `created_at`) VALUES
(3, 1, 'Laptop', 'This laptop is ready to be on market', 250000.00, 2, '/uploads/1764177753164.jfif', 'approved', 0, '2025-11-26 17:22:33'),
(4, 1, 'Laptop', 'This laptop is ready to be on market', 260000.00, 2, '/uploads/1764177791560.jfif', 'approved', 0, '2025-11-26 17:23:11'),
(5, 2, 'Mudasobwa', 'Iyi computer iragurishwa ku mafaranga make cyane', 200000.00, 2, '/uploads/1764180616368.jfif', 'approved', 0, '2025-11-26 18:10:16');

-- --------------------------------------------------------

--
-- Table structure for table `product_out`
--

CREATE TABLE `product_out` (
  `id` int(11) NOT NULL,
  `productid` int(11) NOT NULL,
  `buyer_id` int(11) NOT NULL,
  `seller_id` int(11) NOT NULL,
  `sale_price` decimal(12,2) NOT NULL,
  `commission_amount` decimal(12,2) NOT NULL,
  `seller_amount` decimal(12,2) NOT NULL,
  `mobile_money_txn_id` varchar(200) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sessions`
--

CREATE TABLE `sessions` (
  `sid` varchar(36) NOT NULL,
  `expires` datetime DEFAULT NULL,
  `data` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `transactions`
--

CREATE TABLE `transactions` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `type` enum('payment','payout','commission') NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `currency` varchar(10) DEFAULT 'RWF',
  `status` enum('pending','success','failed') DEFAULT 'pending',
  `provider_txn_id` varchar(255) DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(150) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(32) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','seller','customer') DEFAULT 'seller',
  `profile_image` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `email`, `phone`, `password`, `role`, `profile_image`) VALUES
(1, 'Kubwayo', 'kubwa@gmail.com', '250785611427', 'kubwa', '', NULL),
(2, 'Habimana', 'habimana@gmail.com', '250788860155', 'habi', 'admin', NULL),
(3, 'sekabanza', 'jeandelapaix2013@gmail.com', '250785549300', 'seka', 'seller', NULL),
(5, 'juru', 'juru@gmail.com', '0785611427', '$2b$10$SGOBpKgQe0qH3OszhrdtIuAx0YWf/q6D.px1Q61V7XMOki7NyxwXa', 'admin', NULL),
(6, 'yes', 'yes@gmail.com', '0788860155', '$2b$10$5Ztccs1dgnjW1B7dhUm3vuHSxad/4LDWQ9xHaENc6UrZNp2gnqXqu', 'admin', '/uploads/1764441250177.jfif'),
(9, 'jojo', 'jojo@gmail.com', '0788860156', '$2b$10$puCmYc99.pOKhKhM5X/uhOxMyRh5XRD4PtMdeDx35RuMfWsWJddhu', 'admin', NULL),
(10, 'joji', 'joji@gmail.com', '0788860159', '$2b$10$H1wjEeV4b1SvJkQJ0yUTG.jBCJAl0P3lbPhuvj.Fejb2gaYCgO5jO', 'seller', '/uploads/1764446055103.jfif'),
(11, 'kiki', 'kiki@gmail.com', '0785611428', '$2b$10$JIdydNzXLUjy.YZ4QDzW../F6GHJABCzOtTzivEUwbYwyJ3km5jH6', 'customer', '/uploads/1764427080331.jfif'),
(12, 'mimi', 'mimi@gmail.com', '0785611429', '$2b$10$LiVtCKbQn2j9BRQeaGt2ZeZ4yYqWvZE4LBnqeM7cqGoyWoo8Ep5j2', 'admin', NULL),
(13, 'bibi', 'bibi@gmail.com', '0785611420', '$2b$10$FlDcHQaCGrswySQ2I.FmDuK9st.iL5r/F..TbxBnG3XoYdVcB.cCG', 'admin', NULL),
(16, 'bibic', 'bibic@gmail.com', '0785611423', '$2b$10$26xc0./foHUXRHkHXV84jOLqUwrqMK58m3I9y7bL9e9lowwn74fcC', 'admin', NULL),
(18, 'bibica', 'bibica@gmail.com', '0785611421', '$2b$10$nPokr/7R80cUhmzkFDNrpuKCH8SDF6LF6rIZMqt.y9vLB5PvxSfrS', 'admin', NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `cart`
--
ALTER TABLE `cart`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`productid`),
  ADD KEY `seller_id` (`seller_id`);

--
-- Indexes for table `product_out`
--
ALTER TABLE `product_out`
  ADD PRIMARY KEY (`id`),
  ADD KEY `productid` (`productid`),
  ADD KEY `buyer_id` (`buyer_id`),
  ADD KEY `seller_id` (`seller_id`);

--
-- Indexes for table `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`sid`);

--
-- Indexes for table `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `phone` (`phone`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `cart`
--
ALTER TABLE `cart`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `productid` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `product_out`
--
ALTER TABLE `product_out`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `transactions`
--
ALTER TABLE `transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `products_ibfk_1` FOREIGN KEY (`seller_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `product_out`
--
ALTER TABLE `product_out`
  ADD CONSTRAINT `product_out_ibfk_1` FOREIGN KEY (`productid`) REFERENCES `products` (`productid`),
  ADD CONSTRAINT `product_out_ibfk_2` FOREIGN KEY (`buyer_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `product_out_ibfk_3` FOREIGN KEY (`seller_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `transactions`
--
ALTER TABLE `transactions`
  ADD CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
