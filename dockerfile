FROM node:lts-alpine

# 2. Define o diretório de trabalho dentro do container
WORKDIR /server

# 3. Copia os arquivos de dependência para o container
COPY package*.json ./

# 4. Instala as dependências do projeto
RUN npm install

# 5. Copia o restante do código do projeto para o container
COPY . .

# 6. Expõe a porta que seu app vai usar (ex: 3000)
EXPOSE 1920

# 7. Comando para iniciar a aplicação
CMD ["npm", "start"]