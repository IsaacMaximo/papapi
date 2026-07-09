

Projeto começou - 19/04/2026
preciso ligar a uma bd para ser mais rapido

[Scraper] → [Banco de Dados] → [API] → [Frontend (comparador)]

//ideia, verificar itens na bd e caso seja sobre algo que nao tem resultados na bd rodar o scrapper localmente no pc do user

-- Campos essenciais - cada produto na bd
id_product (UUID/PK)
nome_produto (VARCHAR) - "Smartphone XYZ 128GB"
descricao (TEXT) - Descrição detalhada
preco_atual (DECIMAL)
preco_anterior (DECIMAL) - Para mostrar desconto
url_produto (VARCHAR) - Link original
url_imagem (VARCHAR)
sku (VARCHAR) - Código único do produto
marca (VARCHAR) - Indexado para busca
modelo (VARCHAR)

-- Metadados
loja (VARCHAR) - Amazon, Mercado Livre, etc.
categoria_principal (VARCHAR) - Eletrônicos, Vestuário...
subcategoria (VARCHAR) - Smartphones, Camisetas...
data_coleta (TIMESTAMP)
data_atualizacao (TIMESTAMP)
disponibilidade (BOOLEAN) - Em estoque?
avaliacao_media (DECIMAL) - Se o site tiver
numero_avaliacoes (INTEGER)

-- Campos para filtros avançados
especificacoes (JSONB) - Armazena specs dinâmicas
  Ex: {
    "ram": "8GB",
    "armazenamento": "128GB",
    "cor": "preto",
    "processador": "Snapdragon 8"
  }

tags (ARRAY) - Para busca flexível
  Ex: ['smartphone', '5g', 'android']



  filtragem

  login

  visual

  MERCADONA
