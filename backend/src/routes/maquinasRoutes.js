import express from "express";
import { getMaquinas , createMaquina} from "../controllers/maquinasController.js";
 // , updateMaquina, deleteMaquina 
const router = express.Router();
  

router.get("/", getMaquinas);

router.post("/", createMaquina);


export default router;
