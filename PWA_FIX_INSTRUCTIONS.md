# Instruções para Finalizar Correção PWA

Para garantir 100% de compatibilidade com o Chrome Android e corrigir o problema de instalação, mudei a configuração para exigir ícones **PNG** em vez de WebP (que pode ser problemático em alguns casos) e adicionei screenshots para uma instalação rica.

## 1. Ação Necessária: Converter Ícones

Você precisa substituir os arquivos de ícone na pasta `public/` por versões **.png**.

**Converta seus ícones originais de WebP para PNG e salve-os na pasta `c:\Projects\PayFlow\public\` com os seguintes nomes:**

- `icon-144x144.png` (Tamanho: 144x144 px)
- `icon-192x192.png` (Tamanho: 192x192 px)
- `icon-512x512.png` (Tamanho: 512x512 px)

> **Delete** os arquivos `.webp` antigos da pasta `public` para evitar confusão.

## 2. O que já foi feito (Configurado automaticamente)

- ✅ **Manifest atualizado:** Configurado para apontar para os novos ícones PNG.
- ✅ **Cor corrigida:** Tema ajustado para Verde (`#059669`).
- ✅ **Rich Install:** Adicionados Screenshots (Mobile e Desktop) para habilitar a experiência de instalação rica do Chrome.
- ✅ **Categorias e Orientação:** Adicionados metadados extras que o Chrome valoriza.
- ✅ **Paths Corrigidos:** Caminhos absolutos `/PayFlow/` configurados.

## 3. Após substituir os arquivos

Rode o comando de build e faça o deploy:

```bash
npm run build
git add .
git commit -m "Update PWA icons to PNG"
git push
```

## 4. Como Testar (Importante!)

O Chrome Android tem um cache **muito agressivo** para PWAs. Se você não vir mudanças:

1. Acesse o site no Chrome Android.
2. Vá em **Configurações > Configurações do Site > Dados armazenados**.
3. Procure por `paracosmus.github.io` e limpe os dados.
4. Recarregue a página.
5. Aguarde o banner de instalação ou vá no menu "Instalar App".
