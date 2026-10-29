import express from "express";
 import { getUsers } from "../controllers/usersController.js";
// , createUsers, updateUsers, deleteUsers,

const router = express.Router();

 router.get("/", getUsers);

// router.post("/", createUsers);

// router.put("/:id", updateUsers);

// router.delete("/:id", deleteUsers);

export default router;
