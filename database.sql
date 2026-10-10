  drop database ceid_project;
  create database ceid_project;
  use ceid_project;
  CREATE TABLE IF NOT EXISTS `users` (
    `userID` int(10) NOT NULL auto_increment
    ,`username` varchar(200) NOT NULL
    ,`password` varchar(200) NOT NULL
    ,`email` varchar(200) NOT NULL UNIQUE
    ,`isAdmin` TINYINT(1) NOT NULL
    ,PRIMARY KEY (`userID`)
  ) ENGINE=InnoDB COLLATE=utf8_unicode_ci;
  
CREATE TABLE IF NOT EXISTS `points_of_interest` (
    `pointId` int(10) NOT NULL auto_increment
    ,`givenId` varchar(100) NOT NULL UNIQUE
    ,`name` varchar(20) 
    ,`types` JSON
    ,`address` varchar(20) 
    ,`coordinates` Point NOT NULL 
    ,PRIMARY KEY (`pointId`)
  ) ENGINE=InnoDB COLLATE=utf8_unicode_ci;

  --   CREATE TABLE IF NOT EXISTS `types` (
  --   `typeId` int(10) NOT NULL auto_increment,
  --   `typeName` varchar(100) not null,
  --   PRIMARY KEY (`typeId`)
  -- ) ENGINE=InnoDB;



  --  CREATE TABLE IF NOT EXISTS `has_types` (
  --   `id` int(10) NOT NULL auto_increment,
  --   `pointId` int(10) NOT NULL ,
  --   `typeId` int(10) NOT NULL,
  --   PRIMARY KEY (`id`),
  --   CONSTRAINT c1 FOREIGN KEY (pointId) REFERENCES points_of_interest (pointId) ON DELETE RESTRICT ON UPDATE CASCADE,
  --    CONSTRAINT c2 FOREIGN KEY (typeId) REFERENCES types (typeId) ON DELETE RESTRICT ON UPDATE CASCADE

  -- ) ENGINE=InnoDB;


      CREATE TABLE IF NOT EXISTS `poi_popular_times` (
    `pt_id` int(10) NOT NULL auto_increment,
    `pointId` int(10) NOT NULL ,
    `day` varchar(20) NOT NULL ,
    `hour_0` int(5) ,
    `hour_1` int(5) ,
    `hour_2` int(5) ,
    `hour_3` int(5) ,
    `hour_4` int(5) ,
    `hour_5` int(5) ,
    `hour_6` int(5) ,
    `hour_7` int(5) ,
    `hour_8` int(5) ,
    `hour_9` int(5) ,
    `hour_10` int(5) ,
    `hour_11` int(5) ,
    `hour_12` int(5) ,
    `hour_13` int(5) ,
    `hour_14` int(5) ,
    `hour_15` int(5) ,
    `hour_16` int(5) ,
    `hour_17` int(5) ,
    `hour_18` int(5) ,
    `hour_19` int(5) ,
    `hour_20` int(5) ,
    `hour_21` int(5) ,
    `hour_22` int(5) ,
    `hour_23` int(5) ,
    PRIMARY KEY (`pt_id`),
    CONSTRAINT c3 FOREIGN KEY (pointId) REFERENCES points_of_interest (pointId)
  ) ENGINE=InnoDB;


   CREATE TABLE IF NOT EXISTS `infected_users` (
    `inf_id` int(10) NOT NULL auto_increment,
    `userID` int(10) NOT NULL ,
    `isInfected` tinyint(1),
    `infected_date` date,
    PRIMARY KEY (`inf_id`),
    CONSTRAINT c4 FOREIGN KEY (userID) REFERENCES users (userID)
  ) ENGINE=InnoDB;

  CREATE TABLE IF NOT EXISTS `userVisitedPoint` (
    `id` int(10) NOT NULL auto_increment,
    `userID` int(10) NOT NULL,
    `pointId` int(10) NOT NULL,
    `numberOfUsers` int(10),
    `timestamp` DATETIME NOT NULL,
     PRIMARY KEY (`id`),
     CONSTRAINT usrVistPointPoint FOREIGN KEY (pointId) REFERENCES points_of_interest (pointId) ON DELETE RESTRICT ON UPDATE CASCADE,
     CONSTRAINT usrVistPointUser FOREIGN KEY (userID) REFERENCES users (userID) ON DELETE RESTRICT ON UPDATE CASCADE
  ) ENGINE=InnoDB COLLATE=utf8_unicode_ci;


-- Create the first admin account with:  node create-admin.js <username> <email> <password>
-- (passwords are stored as bcrypt hashes, so they cannot be inserted here in plain text) 