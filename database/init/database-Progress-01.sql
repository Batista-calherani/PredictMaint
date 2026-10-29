use PredictMaint;

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