import express from "express";
import { getMaquinas , createMaquina, updateMaquina, deleteMaquina} from "../controllers/maquinasController.js";
const router = express.Router();
  

router.get("/", getMaquinas);

router.post("/", createMaquina);

router.put("/:id", updateMaquina);

router.delete("/:id", deleteMaquina);


export default router;
