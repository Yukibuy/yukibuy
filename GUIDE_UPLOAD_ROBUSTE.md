# 🚀 GUIDE DÉPLOIEMENT - UPLOAD ROBUSTE YUKIBUY

## 🎯 RÉSOLUTION DU PROBLÈME

**Problème initial :** Le bouton "Envoyer les fichiers" ne répond pas avec les gros fichiers.

**Solution :** Architecture complètement repensée avec upload résumable par chunks.

## 📁 FICHIERS CRÉÉS

1. **Code.gs** - Google Apps Script avec upload résumable
2. **upload-robuste.html** - Interface client avec gestion chunks
3. **GUIDE_UPLOAD_ROBUSTE.md** - Ce guide

## 🔧 ÉTAPES DE DÉPLOIEMENT

### **1. Déployer Google Apps Script**

1. **Ouvrir :** https://script.google.com
2. **Nouveau projet :** "YukiBuy Upload Robuste"
3. **Coller le contenu de `Code.gs`**
4. **Configurer les constantes :**
   ```javascript
   const FOLDER_ID = 'VOTRE_FOLDER_ID_GOOGLE_DRIVE'; // Optionnel
   const ALLOWED_ORIGIN = 'https://yukibuy.com'; // Ou '*' pour dev
   const SCRIPT_SECRET = 'yukibuy_upload_2024'; // Sécurité
   ```

5. **Sauvegarder le projet**

6. **Déployer :**
   - Cliquer "Deploy" → "New deployment"
   - Type: "Web app"  
   - Execute as: "Me"
   - Who has access: "Anyone"
   - Cliquer "Deploy"

7. **Copier l'URL de déploiement** (commence par https://script.google.com/macros/s/...)

### **2. Configurer l'interface HTML**

1. **Ouvrir `upload-robuste.html`**
2. **Modifier la ligne 159 :**
   ```javascript
   APPS_SCRIPT_URL: 'https://script.google.com/macros/s/VOTRE_ID_ICI/exec'
   ```

3. **Optionnel - Ajuster les seuils :**
   ```javascript
   SIMPLE_THRESHOLD: 40 * 1024 * 1024, // 40 MB
   CHUNK_SIZE: 8 * 1024 * 1024, // 8 MB
   SECRET: 'yukibuy_upload_2024' // Même que côté Apps Script
   ```

### **3. Tester localement**

1. **Ouvrir `upload-robuste.html` dans le navigateur**
2. **Sélectionner un petit fichier (<40MB)** → Mode simple
3. **Sélectionner un gros fichier (>40MB)** → Mode résumable
4. **Vérifier les logs dans la console F12**

### **4. Intégrer à yukibuy.com**

**Option A - Page dédiée :**
- Uploader `upload-robuste.html` vers Netlify
- Accessible via `https://yukibuy.com/upload-robuste.html`

**Option B - Intégrer à l'existant :**
- Remplacer la section upload dans `index.html` par le code robuste

## ✅ AVANTAGES DE LA NOUVELLE ARCHITECTURE

### **🔄 Upload Résumable**
- **Fichiers >40MB** découpés en chunks de 8MB
- **Reprise automatique** en cas d'interruption
- **Progression détaillée** par chunk et globale

### **⚡ Performance**
- **Mode simple** pour fichiers ≤40MB (upload direct)
- **Mode résumable** pour gros fichiers (>40MB)
- **Chunks parallèles possibles** (amélioration future)

### **🛡️ Robustesse**
- **Gestion d'erreurs complète** avec retry automatique
- **Validation côté client et serveur**
- **Sécurité avec secret partagé**
- **CORS configuré** pour domaine spécifique

### **📊 Monitoring**
- **Logs détaillés** côté Apps Script et client
- **Progression en temps réel** avec barres visuelles
- **Status par chunk** et global

## 🧪 TESTS RECOMMANDÉS

### **Test 1 - Fichier simple (≤40MB)**
```
Fichier: test-25MB.csv
Résultat attendu: Mode simple, upload direct
```

### **Test 2 - Fichier résumable (>40MB)**
```
Fichier: GoogleAds_90jours_50MB.csv (103.7MB)
Résultat attendu: Mode résumable, 13 chunks de 8MB
```

### **Test 3 - Très gros fichier (>500MB)**
```
Fichier: Combined_AllPlatforms_600MB.csv
Résultat attendu: Mode résumable, 75 chunks, ~5-10 min
```

### **Test 4 - Interruption réseau**
```
Action: Couper réseau pendant upload
Résultat attendu: Reprise automatique au prochain chunk
```

## 📈 MONITORING & DEBUG

### **Logs Google Apps Script**
1. Script.google.com → Votre projet
2. Exécutions → Voir les logs en temps réel
3. Chercher : `🚀 doPost called`, `✅ Upload terminé`

### **Logs navigateur**
1. F12 → Console
2. Chercher : `📤 Upload simple`, `☁️ Upload résumable`
3. Progression : `Chunk 1/13`, `✅ Upload simple réussi`

### **Vérification Drive**
1. Google Drive → Dossier configuré dans FOLDER_ID
2. Email de notification à contact@yukibuy.com

## ⚠️ LIMITES & CONSIDÉRATIONS

### **Quotas Google Apps Script**
- **6 minutes** par exécution → chunks de 8MB évitent timeout
- **90 minutes/jour** par utilisateur → pour usage intensif
- **Solutions :** Multiplier les comptes ou migrer vers Cloud Run

### **Quotas Google Drive**
- **750 GB/jour** par utilisateur → largement suffisant
- **Fichiers >1GB** supportés mais lent côté navigateur

### **Performance navigateur**
- **RAM limitée** → éviter fichiers >1GB sur mobiles
- **Connexion lente** → chunks de 8MB optimaux

## 🚀 MISE EN PRODUCTION

### **Checklist finale**
- [ ] Code.gs déployé avec bonnes constantes
- [ ] upload-robuste.html configuré avec bonne URL Apps Script
- [ ] Tests validés sur fichiers 25MB et 100MB+
- [ ] Email notifications fonctionnelles
- [ ] Logs visibles dans Apps Script et navigateur

### **Remplacement de l'ancien système**
1. **Sauvegarder** l'ancien `index.html`
2. **Extraire** la section upload de `upload-robuste.html`
3. **Remplacer** dans `index.html` la partie upload actuelle
4. **Déployer** sur Netlify
5. **Tester** en production

## 🎉 RÉSULTAT ATTENDU

**Avant :** Bouton inactif, uploads >100MB échouent
**Après :** 
- ✅ Fichiers jusqu'à 1GB+ supportés
- ✅ Progression visuelle en temps réel
- ✅ Reprise automatique en cas d'interruption
- ✅ Double mode (simple + résumable) selon taille
- ✅ Architecture évolutive et robuste

**Le problème "rien ne se produit" sera définitivement résolu !** 🚀