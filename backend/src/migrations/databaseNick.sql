CREATE DATABASE IF NOT EXISTS predictMaint;

use predictMaint;

create table if not exists maquinas(
id int auto_increment primary key,
codigo varchar(100) not null,
nome varchar(255) default 'Maquina não definida',
categoria varchar(255) not null default 'Outros',
status varchar(100) not null default 'Normal',
manutencao date,
mediacao varchar(100) default null,
health numeric(2,2)
);

create table if not exists users(
id int auto_increment primary key,
email varchar(100) not null,
senha varchar(100) not null,
nome varchar(255) default 'Usuário',
perfil varchar(100) not null default 'Funcionário');


INSERT INTO maquinas (codigo, nome, categoria, status, manutencao, mediacao, health)
VALUES
('MQ001', 'Máquina de Corte CNC', 'Industrial', 'Normal', '2026-11-15', 'Temperatura', 0.95),
('MQ002', 'Esteira Transportadora', 'Transporte', 'Manutenção', '2026-11-05', 'Velocidade', 0.75),
('MQ003', 'Prensa Hidráulica', 'Industrial', 'Normal', '2026-12-10', 'Pressão', 0.88),
('MQ004', 'Robô de Soldagem', 'Automação', 'Atenção', '2026-11-20', 'Temperatura', 0.65),
('MQ005', 'Compressor de Ar', 'Pneumática', 'Normal', '2027-01-10', 'Pressão', 0.99),
('MQ006', 'Máquina de Embalagem', 'Embalagem', 'Normal', '2026-12-01', 'Velocidade', 0.92),
('MQ007', 'Torno Mecânico', 'Usinagem', 'Crítico', '2026-11-02', 'Vibração', 0.35),
('MQ008', 'Furadeira Industrial', 'Industrial', 'Normal', '2027-02-15', 'Temperatura', 0.97),
('MQ009', 'Esteira de Montagem', 'Transporte', 'Atenção', '2026-11-12', 'Velocidade', 0.55),
('MQ010', 'Injetora de Plástico', 'Produção', 'Normal', '2026-12-20', 'Pressão', 0.89);

INSERT INTO users (email, senha, nome, perfil) VALUES
('joao.silva@email.com', '123456', 'João Silva', 'Administrador'),
('maria.santos@email.com', '123456', 'Maria Santos', 'Funcionário'),
('pedro.oliveira@email.com', '123456', 'Pedro Oliveira', 'Funcionário'),
('ana.costa@email.com', '123456', 'Ana Costa', 'Funcionário'),
('carlos.souza@email.com', '123456', 'Carlos Souza', 'Administrador'),
('juliana.lima@email.com', '123456', 'Juliana Lima', 'Funcionário'),
('rafael.almeida@email.com', '123456', 'Rafael Almeida', 'Funcionário'),
('fernanda.rocha@email.com', '123456', 'Fernanda Rocha', 'Funcionário'),
('lucas.martins@email.com', '123456', 'Lucas Martins', 'Administrador'),
('beatriz.ferreira@email.com', '123456', 'Beatriz Ferreira', 'Funcionário');