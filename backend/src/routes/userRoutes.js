import express from "express";
 import { getUsers, createUsers, deleteUsers, updateUsers} from "../controllers/usersController.js";


const router = express.Router();

 router.get("/", getUsers);
 
 router.post("/", createUsers);

router.put("/:id", updateUsers);

router.delete("/:id", deleteUsers);

export default router;
