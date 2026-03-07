CREATE TABLE `game_states` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` int NOT NULL,
	`stateJson` text NOT NULL,
	`version` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `game_states_id` PRIMARY KEY(`id`),
	CONSTRAINT `game_states_roomId_unique` UNIQUE(`roomId`)
);
--> statement-breakpoint
CREATE TABLE `room_players` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` int NOT NULL,
	`userId` int NOT NULL,
	`playerName` varchar(64) NOT NULL,
	`seatIndex` int NOT NULL,
	`isConnected` int NOT NULL DEFAULT 1,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `room_players_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(8) NOT NULL,
	`name` varchar(64) NOT NULL,
	`hostId` int NOT NULL,
	`status` enum('waiting','playing','finished') NOT NULL DEFAULT 'waiting',
	`gameLength` enum('short','medium','long') NOT NULL DEFAULT 'medium',
	`maxPlayers` int NOT NULL DEFAULT 4,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rooms_id` PRIMARY KEY(`id`),
	CONSTRAINT `rooms_code_unique` UNIQUE(`code`)
);
