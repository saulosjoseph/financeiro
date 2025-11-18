# Configuração do Google OAuth

Para configurar o login com Google, siga os passos abaixo:

## 1. Criar Projeto no Google Cloud Console

1. Acesse https://console.cloud.google.com/
2. Crie um novo projeto ou selecione um existente
3. Vá para "APIs & Services" > "Credentials"

## 2. Configurar OAuth Consent Screen

1. Clique em "OAuth consent screen"
2. Selecione "External" e clique em "Create"
3. Preencha:
   - **App name**: Financeiro App
   - **User support email**: seu email
   - **Developer contact**: seu email
4. Clique em "Save and Continue"
5. Em "Scopes", clique em "Add or Remove Scopes"
6. Adicione:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
7. Clique em "Save and Continue"
8. Em "Test users", adicione seu email para testes
9. Clique em "Save and Continue"

## 3. Criar OAuth Client ID

1. Volte para "Credentials"
2. Clique em "Create Credentials" > "OAuth client ID"
3. Selecione "Web application"
4. Preencha:
   - **Name**: Financeiro App
   - **Authorized JavaScript origins**:
     - `http://localhost:3000`
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/callback/google`
5. Clique em "Create"

## 4. Copiar Credenciais

1. Após criar, você verá o **Client ID** e **Client Secret**
2. Copie ambos e adicione no arquivo `.env.local`:

```env
AUTH_GOOGLE_ID=seu-client-id-aqui
AUTH_GOOGLE_SECRET=seu-client-secret-aqui
```

## 5. Testar

1. Reinicie o servidor: `npm run dev`
2. Acesse http://localhost:3000
3. Clique em "Entrar com Google"
4. Faça login com sua conta Google

## Observações

- Em produção, adicione a URL de produção nas "Authorized redirect URIs"
- Exemplo: `https://seudominio.com/api/auth/callback/google`
- Atualize também a variável `NEXTAUTH_URL` no `.env` de produção

## Variáveis de Ambiente Necessárias

```env
DATABASE_URL=postgresql://financeiro:financeiro123@localhost:5432/financeiro
AUTH_SECRET=RK7CMQk7xlqQYPF43jCiTDUmEsMM+pC5f1PKvkhba9U=
AUTH_GOOGLE_ID=seu-google-client-id
AUTH_GOOGLE_SECRET=seu-google-client-secret
NEXTAUTH_URL=http://localhost:3000
```
