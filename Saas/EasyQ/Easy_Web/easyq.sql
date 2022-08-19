-- phpMyAdmin SQL Dump
-- version 4.4.14
-- http://www.phpmyadmin.net
--
-- Host: localhost
-- Generation Time: Apr 08, 2018 at 07:32 PM
-- Server version: 5.6.26
-- PHP Version: 5.6.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `easyq`
--

-- --------------------------------------------------------

--
-- Table structure for table `queue_log`
--

CREATE TABLE IF NOT EXISTS `queue_log` (
  `merchant_id` bigint(20) NOT NULL,
  `queue_id` bigint(20) NOT NULL,
  `queuename` varchar(255) NOT NULL,
  `start_time` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00' ON UPDATE CURRENT_TIMESTAMP,
  `end_time` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `latitude` double NOT NULL,
  `longitude` double NOT NULL,
  `ip` text NOT NULL,
  `physical` text NOT NULL,
  `users_joined` int(11) NOT NULL,
  `hits` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `queue_relatime`
--

CREATE TABLE IF NOT EXISTS `queue_relatime` (
  `merchant_id` bigint(20) NOT NULL,
  `queue_id` bigint(20) NOT NULL,
  `queuename` varchar(255) NOT NULL,
  `start_time` bigint(20) NOT NULL,
  `end_time` bigint(20) NOT NULL,
  `latitude` double NOT NULL,
  `longitude` double NOT NULL,
  `ip` text NOT NULL,
  `physical` text NOT NULL,
  `users_joined` int(11) NOT NULL,
  `hits` int(11) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=latin1;

--
-- Dumping data for table `queue_relatime`
--

INSERT INTO `queue_relatime` (`merchant_id`, `queue_id`, `queuename`, `start_time`, `end_time`, `latitude`, `longitude`, `ip`, `physical`, `users_joined`, `hits`) VALUES
(18, 41, 'Gangalal Hospital', 1523173797, 1523256597, 29.139645942027563, 76.10496538618213, '::1', '30-8D-99-69-2B-2A', 0, 0),
(18, 42, 'MNNIT', 1523174575, 1523257375, 28.504377493707796, 79.34593218305713, '::1', '30-8D-99-69-2B-2A', 0, 0);

-- --------------------------------------------------------

--
-- Table structure for table `registered_users`
--

CREATE TABLE IF NOT EXISTS `registered_users` (
  `id` bigint(20) NOT NULL,
  `name` varchar(255) NOT NULL,
  `contact_number` varchar(20) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `dob` date NOT NULL,
  `date` date NOT NULL,
  `signup_latitude` varchar(255) NOT NULL,
  `signup_longitude` varchar(255) NOT NULL,
  `gender` varchar(1) NOT NULL,
  `ip_address` varchar(255) NOT NULL,
  `physical_address` varchar(255) NOT NULL,
  `activated` int(1) NOT NULL DEFAULT '0',
  `activation_id` varchar(5) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=latin1;

--
-- Dumping data for table `registered_users`
--

INSERT INTO `registered_users` (`id`, `name`, `contact_number`, `email`, `password`, `dob`, `date`, `signup_latitude`, `signup_longitude`, `gender`, `ip_address`, `physical_address`, `activated`, `activation_id`) VALUES
(7, 'Rajan Jha', '9115316629', 'jharajan20@gmail.com', '40ee92b7bfc638b643954c2c13e021f8', '1998-12-02', '2018-04-05', '25.490039', '81.860682', 'M', '::1', '30-8D-99-69-2B-2A', 1, 'bp2i6'),
(8, 'Anand Kumar', '7080299754', 'anandkumar@gmail.com', '1e0dcbb10af7c1cb13ba52c494d1aa7e', '1998-12-02', '2018-04-05', '25.490039', '81.860682', 'M', '::1', '30-8D-99-69-2B-2A', 1, 'i0tdg'),
(9, 'Rahul Jha', '9860111474', 'rockingrahul2015@gmail.com', '4d42c17a023126492eee9144b319eaab', '1998-08-07', '2018-04-05', '25.490039', '81.860682', 'M', '::1', '30-8D-99-69-2B-2A', 0, '7iyvo'),
(10, 'Siddarth Agrawal', '9079349295', 'siddarthagrwal75@gmail.com', 'e10adc3949ba59abbe56e057f20f883e', '1999-03-01', '2018-04-05', '1', '1', 'M', '::1', '30-8D-99-69-2B-2A', 0, 'xlasd'),
(11, 'Ramdas Gond', '9845123544', 'ramdas@gmail.com', '8711e3a0149c15f7c2e521bbe1db1104', '1999-12-05', '2018-04-06', '25.490159799999997', '', 'M', '::1', '30-8D-99-69-2B-2A', 1, '4wnz9'),
(12, 'Ravikant Kumar Neeraj', '9876543210', 'ravikant@gmail.com', 'a00eff94afb05b9966ef2949d0b96815', '1999-12-01', '2018-04-06', '25.490197199999997', '81.8635722', 'M', '::1', '30-8D-99-69-2B-2A', 1, 'ia16d'),
(13, 'Manas Uniyal', '9149379200', 'manasuniyal100@gmail.com', '4b9ddcb10ae6ae205b4abdd6afb7bffe', '1998-12-11', '2018-04-06', '25.4901578', '81.8635789', 'M', '::1', '30-8D-99-69-2B-2A', 1, 'zopdu'),
(14, 'bikram rauniyar', '7521097507', 'bikramrauniyar6789@gmail.com', '25f9e794323b453885f5181f1b624d0b', '1998-01-23', '2018-04-06', '', '', 'M', '::1', '30-8D-99-69-2B-2A', 1, 'gcubv'),
(15, 'Anuj Modi', '9711523327', 'anujmodi2011@gmail.com', '2aa26b198cff6a5aa3da030df6cc8a79', '1999-04-06', '2018-04-07', '', '', 'M', '::1', '30-8D-99-69-2B-2A', 1, 'ubvk9'),
(16, 'Mayank Garg', '9876543210', 'mayankgarg@gmail.com', '308a3820e4cccbe043cb5228de5e71e3', '1994-12-02', '2018-04-07', '25.492865500000004', '81.86281129999999', 'M', '::1', '30-8D-99-69-2B-2A', 1, 'y3w7q'),
(17, 'Mayank Garg', '9865321741', 'mayankgarg@gmail.com', '308a3820e4cccbe043cb5228de5e71e3', '1994-12-02', '2018-04-07', '25.492865500000004', '81.86281129999999', 'M', '::1', '30-8D-99-69-2B-2A', 1, 'ab6vp'),
(18, 'Akshay Sharma', '9832561231', 'akshaysharma@gmail.com', '0edf51b5b18d6ed7e99b5947530de7d2', '2018-04-13', '2018-04-08', '25.4928787', '81.86266100000002', 'M', '::1', '30-8D-99-69-2B-2A', 1, '24h01');

-- --------------------------------------------------------

--
-- Table structure for table `users_in_queue`
--

CREATE TABLE IF NOT EXISTS `users_in_queue` (
  `id` bigint(20) NOT NULL,
  `queue_id` bigint(20) NOT NULL,
  `user_id` bigint(20) NOT NULL,
  `latitude` varchar(255) NOT NULL,
  `longitude` varchar(255) NOT NULL,
  `ip_address` varchar(255) NOT NULL,
  `physical_address` varchar(255) NOT NULL,
  `time` time NOT NULL,
  `appointed` int(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `users_log`
--

CREATE TABLE IF NOT EXISTS `users_log` (
  `request_id` bigint(20) NOT NULL,
  `queue_id` bigint(20) NOT NULL,
  `user_id` bigint(20) NOT NULL,
  `request_latitude` double NOT NULL,
  `request_longitude` double NOT NULL,
  `ip_address` varchar(255) NOT NULL,
  `mac_address` varchar(255) NOT NULL,
  `join_time` datetime NOT NULL,
  `expected_time` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `uses_realtime`
--

CREATE TABLE IF NOT EXISTS `uses_realtime` (
  `request_id` bigint(20) NOT NULL,
  `queue_id` bigint(20) NOT NULL,
  `user_id` bigint(20) NOT NULL,
  `request_latitude` double NOT NULL,
  `request_longitude` double NOT NULL,
  `ip_address` varchar(255) NOT NULL,
  `mac_address` varchar(255) NOT NULL,
  `join_time` datetime NOT NULL,
  `status` int(11) NOT NULL,
  `estimated_time` datetime NOT NULL,
  `queue_number` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `queue_relatime`
--
ALTER TABLE `queue_relatime`
  ADD PRIMARY KEY (`queue_id`),
  ADD UNIQUE KEY `queue_id` (`queue_id`);

--
-- Indexes for table `registered_users`
--
ALTER TABLE `registered_users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `id` (`id`);

--
-- Indexes for table `users_in_queue`
--
ALTER TABLE `users_in_queue`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `queue_relatime`
--
ALTER TABLE `queue_relatime`
  MODIFY `queue_id` bigint(20) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=43;
--
-- AUTO_INCREMENT for table `registered_users`
--
ALTER TABLE `registered_users`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=19;
--
-- AUTO_INCREMENT for table `users_in_queue`
--
ALTER TABLE `users_in_queue`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;
DELIMITER $$
--
-- Events
--
CREATE DEFINER=`root`@`localhost` EVENT `delete_queue` ON SCHEDULE EVERY 1 SECOND STARTS '2018-04-08 13:17:55' ON COMPLETION PRESERVE ENABLE DO DELETE from queue_relatime where end_time <= CURRENT_TIMESTAMP$$

DELIMITER ;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
