# Política de tratamento de dados pessoais · NotaScan

**Versão 2026.1 · vigente desde 6 de outubro de 2026 · tradução para o português da versão em espanhol**

> **A versão em espanhol é a que vale.** Este texto em português é um rascunho técnico traduzido pela equipe de
> desenvolvimento para que quem lê português possa entendê-lo. **Um advogado deve revisá-lo antes do uso.** Se este texto
> e o espanhol forem diferentes, vale o espanhol.

> **Rascunho técnico.** A equipe de desenvolvimento redigiu a política com base na Lei 1581 de 2012 da Colômbia, no
> Decreto 1377 de 2013 (compilado no Decreto 1074 de 2015) e no funcionamento real do aplicativo. **Um advogado deve
> revisá-la antes de ser usada com dados reais.** Cada escola preenche os campos entre colchetes.

## 1. Quem trata os dados

- **Controlador:** cada escola que usa o NotaScan. **[Nome da escola]**, [NIT], [endereço], [cidade], e-mail de
  atendimento de dados pessoais **[e-mail]**, telefone [telefone]. A escola decide para que os dados da sua comunidade
  são usados.
- **Operador:** NotaScan (Diego Armando Pinta Cuasquen, [documento], [e-mail de contato]). Fornece a plataforma e trata
  os dados apenas em nome da escola e conforme as suas instruções.
- **Suboperadores** que o NotaScan usa para prestar o serviço (ver a seção 6).

## 2. Quais dados são tratados

| Titular | Dados | Para quê |
|---|---|---|
| Estudantes (na maioria **menores de idade**) | Nomes, sobrenomes, tipo e número do documento, código do estudante, turma, situação da matrícula, data da matrícula, quitação (biblioteca, mensalidades, documentos) | Matrícula e gestão acadêmica |
| | Notas, frequência, observações de convivência, pareceres dos docentes, boletins | Registro e acompanhamento acadêmico |
| | **Fotos de provas** (folha com nome, código e nota escrita à mão) | Ler a nota para que o docente a confira |
| | **Dados de saúde** (alergias, condições, observações médicas, contato de emergência). **Dado sensível** | Atendimento de emergências na escola |
| Responsáveis | Nome, parentesco, telefone | Contato sobre o estudante |
| Pessoal da escola (docentes, Secretaria, Direção) | Nome, e-mail institucional, função, área, último acesso, registro das ações que assinam (quem conferiu uma nota, quem decidiu uma solicitação) | Acesso ao aplicativo e rastreabilidade do registro acadêmico |

O NotaScan **não** usa esses dados para publicidade, não os vende e não faz perfis comerciais.

## 3. Finalidades

1. Matricular e acompanhar a vida escolar do estudante (notas, frequência, ficha do aluno, boletins, relatórios).
2. Ler automaticamente a nota das fotos de provas **para que o docente a confira**. A nota que vale é sempre a que o
   docente confirma.
3. Permitir à Direção e à Secretaria a supervisão acadêmica e a estatística institucional.
4. Entrar em contato com o responsável sobre assuntos do estudante.
5. Atender emergências de saúde do estudante (só com autorização expressa para dados sensíveis).
6. Garantir a segurança e a rastreabilidade da plataforma (quem fez cada alteração).

## 4. Autorização

- Os dados de estudantes **menores de idade** são tratados com a **autorização prévia, expressa e informada do seu
  representante legal (responsável)**, respeitando o interesse superior da criança e os seus direitos fundamentais
  (Lei 1581, art. 7. Decreto 1377, art. 12). Quando a maturidade permitir, a opinião do estudante é ouvida.
- **Os dados de saúde são sensíveis.** Fornecê-los é **facultativo** (ninguém é obrigado) e exige autorização explícita e
  separada (Lei 1581, arts. 5 e 6).
- A escola guarda a prova de cada autorização. No NotaScan, a Secretaria registra a autorização assinada com a versão,
  a data e a forma de entrega.
- O pessoal aceita esta política ao entrar pela primeira vez. A aceitação fica registrada com a versão e a data.

## 5. Onde e por quanto tempo são guardados

| Dados | Onde | Por quanto tempo |
|---|---|---|
| Dados acadêmicos e de matrícula | Banco de dados do Supabase (região de São Paulo, Brasil) | O tempo que a norma educacional exigir para o registro acadêmico [**a confirmar pelo advogado**]. Depois são excluídos ou anonimizados |
| Fotos de provas | Armazenamento privado do Supabase (pasta de cada docente) | **Até a escola fechar o período letivo.** Ao fechá-lo são apagadas automaticamente. A nota é mantida |
| Dados de saúde | Banco de dados, com acesso só da Secretaria e da Direção | Enquanto o estudante estiver matriculado ou até a autorização ser revogada |
| Registro de autorizações e aceitações | Banco de dados | Enquanto durar a relação com a escola e o prazo legal para comprovar a autorização |
| Fila offline do diário de classe | No computador do docente (armazenamento local do aplicativo) | Até a nota ser enviada ao banco |
| Preferência de tema (claro, escuro ou como o sistema) | Só neste computador (armazenamento local do aplicativo). Não identifica a pessoa e não é enviada à NotaScan nem a terceiros | Até ser alterada ou até os dados do aplicativo serem apagados |

## 6. Com quem são compartilhados

Os dados **não são vendidos nem cedidos** a terceiros. Para prestar o serviço, o NotaScan usa estes suboperadores. Com
cada um deve existir um contrato que os impeça de usar os dados para fins próprios.

| Suboperador | Para quê | País |
|---|---|---|
| Supabase Inc. | Banco de dados, armazenamento de fotos, contas de acesso | Servidores no Brasil (São Paulo). Empresa nos EUA |
| Anthropic PBC | Ler a nota, o código e o nome na foto da prova (modelo Claude Haiku 4.5) | EUA |
| [Provedor de e-mail, por exemplo Brevo] | Enviar convites e códigos de acesso ao pessoal | [País] |

São **transmissões internacionais a operadores** (Decreto 1377, arts. 24 e 25). A foto é enviada à Anthropic **só para
essa leitura**. [**Verificar com o advogado e com o contrato vigente da Anthropic** se ela guarda as imagens, por quanto
tempo, e que não as usa para treinar modelos.]

## 7. Segurança

- Acesso com conta pessoal e senha. Cada função vê só o que precisa (o docente vê as suas turmas, e só a Secretaria e a
  Direção veem dados de saúde e de responsáveis). Isso é aplicado no banco de dados e não só na tela.
- Cada escola vê apenas os seus dados.
- As fotos ficam em armazenamento privado. Cada docente envia e vê só as suas.
- As ações importantes ficam assinadas pelo banco com quem as fez (conferir notas, decidir solicitações, registrar
  autorizações).
- As chaves dos serviços externos ficam só no servidor, nunca no aplicativo.

## 8. Direitos do titular

O titular (ou o responsável, no caso de um menor) pode:

1. **Conhecer, atualizar e corrigir** os seus dados.
2. **Pedir a prova da autorização** que deu.
3. **Ser informado** do uso que foi dado aos seus dados.
4. **Apresentar reclamações** à Superintendência de Indústria e Comércio (SIC) da Colômbia, depois de esgotar o trâmite
   na escola.
5. **Revogar a autorização e pedir a exclusão** dos seus dados, salvo quando houver um dever legal ou contratual de
   conservá-los (por exemplo, o registro acadêmico).
6. **Acessar** os seus dados gratuitamente.

## 9. Como exercer os direitos

- Escrever para **[e-mail de atendimento da escola]** ou ir à Secretaria com o documento do titular (e o do responsável,
  se for menor).
- **Consultas** são respondidas em no máximo **10 dias úteis**, prorrogáveis por mais 5 dias com aviso do motivo
  (Lei 1581, art. 14).
- **Reclamações** (correção, atualização, exclusão, revogação) são respondidas em no máximo **15 dias úteis**,
  prorrogáveis por mais 8 dias com aviso do motivo (Lei 1581, art. 15).
- No NotaScan, a Secretaria pode **exportar todos os dados de um estudante** e **corrigi-los**.

## 10. Alterações desta política

Cada alteração importante tem uma nova versão e uma nova data. O pessoal deve aceitar a nova versão ao entrar no
aplicativo, e a escola informa os responsáveis. Se as finalidades mudarem, a autorização é pedida de novo.

| Versão | Data | Alteração |
|---|---|---|
| 2026.1 | 2026-10-06 | Primeira versão |
