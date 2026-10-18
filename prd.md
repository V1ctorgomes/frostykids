# PRD — Sistema de Controle de Crianças

**Versão:** 1.0  
**Data do evento:** 18/10/2026  
**Prioridade:** Entrega imediata  
**Tipo:** Aplicação web temporária, responsiva

## 1. Objetivo

Desenvolver uma aplicação web simples para gerenciar os cadastros e a presença de crianças durante um evento.

O sistema substituirá o controle manual por planilha, permitindo que vários operadores consultem, cadastrem, editem e realizem check-in de crianças simultaneamente, utilizando celulares ou computadores.

**O foco é a simplicidade, rapidez operacional e integridade dos dados.** Não se trata de um sistema corporativo ou de um produto para evolução contínua.

## 2. Stack tecnológica

| Componente | Tecnologia |
|---|---|
| Front-end | Next.js + TypeScript |
| Interface | Tailwind CSS |
| Back-end | Next.js Server Actions |
| ORM | Prisma |
| Banco de dados | Prisma Postgres |
| Hospedagem | Vercel |
| Autenticação | Senha de acesso compartilhada pela equipe |

O banco será persistente e conectado à aplicação hospedada na Vercel.

Não utilizar SQLite local, localStorage como armazenamento principal ou arquivos JSON para persistência.

## 3. Dados iniciais

A aplicação deverá receber os registros da planilha Excel fornecida.

A planilha contém:

- 99 cadastros de colaboradores.
- 141 crianças identificadas.
- Informações sobre áreas, telefones e acompanhantes.
- Datas de inscrição.

A importação deverá preservar todos os dados disponíveis, inclusive registros com informações incompletas.

O processo de importação não poderá duplicar registros caso seja executado novamente.

## 4. Telas da aplicação

### 4.1. Tela principal — Controle de crianças

Deverá apresentar:

- Total de crianças cadastradas.
- Total de crianças presentes.
- Total de crianças pendentes.
- Campo de pesquisa por nome da criança, responsável ou telefone.
- Botão para cadastrar uma nova família.
- Listagem dos cadastros com ações rápidas de editar e realizar check-in.

A interface deve priorizar o uso em dispositivos móveis.

### 4.2. Cadastro e edição

O mesmo formulário será utilizado tanto para criar quanto para editar registros.

**Dados do responsável:**

- Nome completo.
- Área / setor.
- Telefone / WhatsApp.
- Nome do acompanhante 01.
- Nome do acompanhante 02.

**Dados das crianças:**

- Nome completo.
- Idade, permitindo anos e meses.
- Status de presença.
- Data e hora do check-in.

O formulário deverá permitir adicionar ou remover crianças dinamicamente, sem limitar a quantidade a quatro.

A quantidade de crianças será calculada automaticamente.

**Regras:**

- Nome do responsável e pelo menos uma criança são obrigatórios para novos cadastros.
- Telefone, idade e acompanhantes podem ficar em branco.
- Os registros importados com dados incompletos deverão continuar disponíveis.
- A edição deverá preservar os check-ins já realizados.
- A remoção de crianças exigirá confirmação.
- Não permitir remover uma criança com presença registrada sem antes desfazer seu check-in.
- Alterações deverão ser persistidas imediatamente após salvar.

### 4.3. Check-in

O check-in será realizado individualmente por criança.

Cada criança deverá possuir um status:

- **Pendente:** ainda não realizou o check-in.
- **Presente:** entrada confirmada.

Ao confirmar a entrada:

- Atualizar o status da criança.
- Registrar a data e a hora no servidor.
- Atualizar os indicadores do painel.
- Impedir registros duplicados de entrada.

Deverá existir uma ação para desfazer o check-in em caso de erro operacional, mediante confirmação.

A aplicação não precisará controlar saída das crianças.

## 5. Controle de concorrência

O sistema será utilizado por múltiplos operadores simultaneamente. É obrigatório evitar a perda de dados provocada por edições concorrentes.

### 5.1. Optimistic Locking

Cada registro de responsável e criança deverá possuir um campo `version`, iniciado em zero.

Sempre que um registro for atualizado:

1. Verificar a versão original enviada pelo operador.
2. Realizar a atualização somente se a versão ainda for válida.
3. Incrementar a versão de forma atômica.
4. Caso a versão tenha sido alterada, rejeitar a gravação.

**Exemplo:**

Dois operadores abrem o mesmo cadastro. O primeiro salva uma alteração. Quando o segundo tentar salvar utilizando a versão anterior, o sistema deverá detectar o conflito e impedir a sobrescrita.

Mensagem:

> Este cadastro foi alterado por outro operador. Atualize os dados antes de salvar novamente.

O formulário deverá manter temporariamente o conteúdo digitado, sem sobrescrever as alterações do outro operador.

### 5.2. Concorrência no check-in

- O check-in deverá utilizar atualização atômica no banco.
- Uma criança não poderá receber dois check-ins simultâneos.
- O check-in de uma criança não poderá bloquear a edição de outra criança da mesma família.
- Edições do responsável não deverão sobrescrever informações de presença.
- O sistema deverá buscar novamente os dados após uma operação concluída ou conflitante.

Não será necessário implementar WebSockets. Atualizações após operações, ao retornar à tela e um botão de atualização manual são suficientes.

## 6. Modelagem de dados

### Responsavel

| Campo | Tipo |
|---|---|
| id | String (UUID/CUID) |
| nome | String |
| area | String? |
| telefone | String? |
| acompanhante01 | String? |
| acompanhante02 | String? |
| dataInscricao | DateTime? |
| version | Int |
| createdAt | DateTime |
| updatedAt | DateTime |

### Crianca

| Campo | Tipo |
|---|---|
| id | String (UUID/CUID) |
| responsavelId | String (FK) |
| nome | String |
| idade | String? |
| presente | Boolean |
| checkinEm | DateTime? |
| version | Int |
| createdAt | DateTime |
| updatedAt | DateTime |

Relacionamento: um responsável pode possuir várias crianças.

A idade será armazenada como texto para preservar valores como "1 ano e 6 meses" da planilha original.

## 7. Importação da planilha

Criar um script de importação utilizando Prisma, executado uma única vez antes do evento.

Mapeamento:

- Colaborador → Responsavel.nome
- Área → Responsavel.area
- Telefone → Responsavel.telefone
- Acompanhante 01 e 02 → respectivos campos
- Filho(a) 01 a 04 → registros individuais em Crianca
- Idades → Crianca.idade
- Data de resposta → Responsavel.dataInscricao

Todos os registros importados deverão iniciar com `presente = false`.

A rotina deverá reconhecer registros já importados pela identificação da origem e impedir duplicidade em uma segunda execução.

## 8. Segurança e acesso

Como a aplicação armazenará dados pessoais de crianças e responsáveis, deverão existir controles mínimos de segurança.

- Tela de autenticação com senha compartilhada pela equipe.
- Verificação da autenticação no servidor, inclusive nas Server Actions.
- Sessão por cookie seguro, HttpOnly e SameSite.
- Credenciais armazenadas em variáveis de ambiente na Vercel.
- Nenhuma credencial de banco exposta no navegador.
- Todas as consultas e alterações protegidas por autenticação.
- Não indexar a aplicação em mecanismos de busca.
- Nenhuma rota pública para listagem de dados.

Não será necessário desenvolver gerenciamento de usuários, perfis ou recuperação de senha.

## 9. Requisitos de interface

- Design simples e limpo.
- Layout mobile-first.
- Botões grandes para facilitar o uso por operadores.
- Pesquisa rápida e insensível a maiúsculas/minúsculas.
- Indicadores de carregamento durante gravações.
- Mensagens claras de sucesso e erro.
- Confirmação antes de ações destrutivas.
- Prevenção de múltiplos envios do mesmo formulário.
- Preservação dos dados digitados quando houver erro.

O cadastro deverá ser realizado sem navegação excessiva entre telas.

## 10. Requisitos operacionais

- Vários operadores poderão utilizar a aplicação simultaneamente.
- O banco deverá persistir os dados entre acessos e deploys.
- As operações de edição e check-in deverão utilizar transações ou atualizações atômicas quando necessário.
- As datas e horas deverão ser apresentadas no fuso de Fortaleza (`America/Fortaleza`).
- Todas as operações de escrita deverão ser validadas no servidor.
- A listagem deverá refletir alterações recentes sem exigir recarregar toda a aplicação.
- Erros de rede não poderão ser apresentados como operações concluídas.

## 11. Fora do escopo

Não implementar:

- Dashboard analítico avançado.
- Relatórios complexos.
- Envio de WhatsApp ou e-mails.
- QR Code.
- Controle de saída.
- Gerenciamento de múltiplos eventos.
- Perfis e permissões individuais.
- Histórico detalhado de auditoria.
- WebSockets.
- Microsserviços.
- Integrações externas desnecessárias.

## 12. Critérios de aceite

O sistema estará pronto quando:

- [ ] Os 99 cadastros da planilha estiverem importados, com as 141 crianças identificadas.
- [ ] A consulta por nome ou telefone funcionar.
- [ ] For possível cadastrar uma nova criança durante o evento.
- [ ] For possível editar um cadastro existente.
- [ ] For possível adicionar e remover crianças de um cadastro.
- [ ] For possível registrar e desfazer check-ins individuais.
- [ ] Os totais de cadastrados, presentes e pendentes estiverem corretos.
- [ ] Dois operadores puderem utilizar a aplicação simultaneamente.
- [ ] Edições concorrentes não provocarem perda de dados.
- [ ] Check-ins simultâneos não gerarem duplicidade.
- [ ] Os dados permanecerem salvos após atualizar a página.
- [ ] A aplicação funcionar corretamente em celular.
- [ ] As rotas e operações estiverem protegidas por autenticação.
- [ ] A aplicação estiver publicada e acessível pela Vercel.

## 13. Diretriz final de desenvolvimento

**Desenvolver somente o necessário para operar o evento de 18/10/2026.**

Priorizar funcionalidades completas e confiáveis em vez de abstrações, componentes excessivos ou arquitetura elaborada.

O sistema deverá ser entregue como uma aplicação Next.js integrada ao Prisma Postgres, com cadastro, edição, pesquisa, check-in e proteção contra conflitos de concorrência funcionando de ponta a ponta.