// ========================================
// GOOGLE APPS SCRIPT - UPLOAD RÉSUMABLE YUKIBUY
// Architecture robuste pour fichiers jusqu'à 1GB+
// ========================================

// 🔧 CONFIGURATION - À PERSONNALISER
const FOLDER_ID = 'TODO_REMPLACER_PAR_VOTRE_FOLDER_ID'; // ID du dossier Google Drive cible
const ALLOWED_ORIGIN = 'https://yukibuy.com'; // Ou '*' pour dev
const SCRIPT_SECRET = 'yukibuy_upload_2024'; // Clé de sécurité (optionnel mais recommandé)
const STATE_PREFIX = 'upload_'; // Préfixe pour persistence des sessions

// ========================================
// FONCTIONS PRINCIPALES - ROUTAGE
// ========================================

// Fonction pour requêtes GET (support JSONP)
function doGet(e) {
  console.log('🔗 doGet called');
  
  try {
    // Vérifier si c'est une requête JSONP
    const callback = e ? e.parameter.callback : null;
    
    if (callback) {
      console.log('📞 JSONP callback:', callback);
      
      // Traiter la requête comme un POST (JSONP contournement)
      const result = handleRequest(e);
      
      // Retourner en JSONP
      const jsonpResponse = `${callback}(${JSON.stringify(result)});`;
      return ContentService.createTextOutput(jsonpResponse)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      // Requête GET normale
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'YukiBuy Upload System actif',
        timestamp: new Date().toISOString(),
        note: 'Utilisez callback=nom_fonction pour JSONP'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
  } catch (error) {
    console.error('❌ Error in doGet:', error);
    const errorResult = { success: false, message: error.message };
    
    const callback = e ? e.parameter.callback : null;
    if (callback) {
      const jsonpResponse = `${callback}(${JSON.stringify(errorResult)});`;
      return ContentService.createTextOutput(jsonpResponse)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      return ContentService.createTextOutput(JSON.stringify(errorResult))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
}

// Fonction pour requêtes OPTIONS (preflight CORS)
function doOptions(e) {
  console.log('🔧 doOptions called - CORS preflight');
  return ContentService.createTextOutput(JSON.stringify({ message: 'CORS preflight OK' }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
}

// Fonction pour requêtes POST (upload)
function doPost(e) {
  const result = handleRequest(e);
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
}

// Fonction commune pour traiter les requêtes (POST et JSONP)
function handleRequest(e) {
  try {
    console.log('🚀 handleRequest called - ÉTAPE 1');
    
    // ÉTAPE 1 : PARSING DES PARAMÈTRES
    console.log('Event object exists:', !!e);
    console.log('Parameters:', e ? e.parameter : 'NO PARAMETERS');
    console.log('Query string:', e ? e.queryString : 'NO QUERY');
    console.log('Post data:', e ? e.postData : 'NO POST DATA');
    
    // Vérifier que e existe
    if (!e) {
      throw new Error('Event object manquant');
    }
    
    // Les paramètres peuvent être dans e.parameter, e.queryString, ou POST JSON
    let params = e.parameter || {};
    
    // Si pas de paramètres, essayer de parser la query string
    if (Object.keys(params).length === 0 && e.queryString) {
      console.log('Parsing query string:', e.queryString);
      const queryParams = new URLSearchParams(e.queryString);
      for (const [key, value] of queryParams.entries()) {
        params[key] = value;
      }
    }
    
    // Si encore pas de paramètres, essayer de parser le JSON POST
    if (Object.keys(params).length === 0 && e.postData && e.postData.contents) {
      console.log('Parsing JSON POST data');
      try {
        const postData = JSON.parse(e.postData.contents);
        params = postData;
      } catch (error) {
        console.log('Failed to parse JSON POST, trying as form data');
      }
    }
    
    console.log('Final params:', params);
    
    if (!params.mode) {
      throw new Error('Paramètre mode manquant');
    }
    
    console.log('Mode:', params.mode);
    
    // ÉTAPE 2 : SÉCURITÉ + MODE INIT SEULEMENT
    console.log('🔐 Vérification sécurité...');
    
    // Vérification sécurité (si activée) - utiliser params au lieu de e.parameter
    if (SCRIPT_SECRET && SCRIPT_SECRET !== '') {
      const providedSecret = params.secret;
      if (!providedSecret || providedSecret !== SCRIPT_SECRET) {
        throw new Error('Accès non autorisé - secret invalide');
      }
    }
    
    console.log('✅ Sécurité OK');
    
    const mode = params.mode;
    
    // TOUS LES MODES SUPPORTÉS MAINTENANT
    let result;
    switch (mode) {
      case 'simple':
        console.log('📁 Mode SIMPLE');
        result = saveSimple_(e, params);
        break;
        
      case 'init':
        console.log('🚀 Mode INIT');
        result = initResumable_(
          params.filename,
          params.mimeType,
          parseInt(params.fileSize)
        );
        break;
        
      case 'chunk':
        console.log('📤 Mode CHUNK');
        result = putChunk_(
          params.uploadId,
          parseInt(params.start),
          parseInt(params.end),
          parseInt(params.total),
          params.chunkData
        );
        break;
        
      case 'status':
        console.log('📊 Mode STATUS');
        result = getUploadStatus_(params.uploadId);
        break;
        
      default:
        throw new Error('Mode invalide: ' + mode);
    }
    
    return result;
    
    // AUTRES MODES ENCORE COMMENTÉS
    /*
    console.log('Event object exists:', !!e);
    console.log('Parameters:', e ? e.parameter : 'NO PARAMETERS');
    console.log('Query string:', e ? e.queryString : 'NO QUERY');
    console.log('Post data:', e ? e.postData : 'NO POST DATA');
    
    // Vérifier que e existe
    if (!e) {
      throw new Error('Event object manquant');
    }
    
    // Les paramètres peuvent être dans e.parameter OU dans e.queryString
    let params = e.parameter || {};
    
    // Si pas de paramètres, essayer de parser la query string
    if (Object.keys(params).length === 0 && e.queryString) {
      console.log('Parsing query string:', e.queryString);
      const queryParams = new URLSearchParams(e.queryString);
      for (const [key, value] of queryParams.entries()) {
        params[key] = value;
      }
    }
    
    console.log('Final params:', params);
    
    if (!params.mode) {
      throw new Error('Paramètre mode manquant');
    }
    
    console.log('Mode:', params.mode);
    
    // Vérification sécurité (si activée) - utiliser params au lieu de e.parameter
    if (SCRIPT_SECRET && SCRIPT_SECRET !== '') {
      const providedSecret = params.secret;
      if (!providedSecret || providedSecret !== SCRIPT_SECRET) {
        throw new Error('Accès non autorisé - secret invalide');
      }
    }
    
    const mode = params.mode;
    
    let result;
    switch (mode) {
      case 'simple':
        result = saveSimple_(e, params);
        break;
        
      case 'init':
        result = initResumable_(
          params.filename,
          params.mimeType,
          parseInt(params.fileSize)
        );
        break;
        
      case 'chunk':
        result = putChunk_(
          params.uploadId,
          parseInt(params.start),
          parseInt(params.end),
          parseInt(params.total),
          e.postData ? e.postData.contents : params.chunkData
        );
        break;
        
      case 'status':
        result = getUploadStatus_(params.uploadId);
        break;
        
      default:
        throw new Error('Mode invalide: ' + mode);
    }
    
    return result;
    */
    
  } catch (error) {
    console.error('❌ Error in handleRequest:', error);
    return {
      success: false,
      message: error.message,
      details: error.toString()
    };
  }
}

// ========================================
// HELPERS - CORS ET SÉCURITÉ
// ========================================
function withCors_(content, status = 200) {
  // Simple retour JSON sans headers CORS (JSONP n'en a pas besoin)
  return ContentService.createTextOutput(JSON.stringify(content))
    .setMimeType(ContentService.MimeType.JSON);
}

function requireSecret_(e) {
  if (SCRIPT_SECRET && SCRIPT_SECRET !== '') {
    const providedSecret = e.parameter.secret;
    if (!providedSecret || providedSecret !== SCRIPT_SECRET) {
      throw new Error('Accès non autorisé - secret invalide');
    }
  }
}

// ========================================
// MODE SIMPLE - FICHIERS ≤ 40MB
// ========================================
function saveSimple_(e, params) {
  console.log('📁 Mode simple - saveSimple_');
  
  const filename = params.filename;
  const mimeType = params.mimeType || 'application/octet-stream';
  
  if (!filename) {
    throw new Error('Nom de fichier manquant');
  }
  
  // Recomposer le blob depuis le JSON (JSONP ou POST)
  let bytesArray;
  if (params.fileData) {
    // Mode JSONP - données dans paramètres
    console.log('📄 Données fichier via JSONP');
    bytesArray = JSON.parse(params.fileData);
  } else if (e.postData && e.postData.contents) {
    // Mode POST classique
    console.log('📄 Données fichier via POST');
    bytesArray = JSON.parse(e.postData.contents);
  } else {
    throw new Error('Données fichier manquantes');
  }
  
  const blob = Utilities.newBlob(bytesArray, mimeType, filename);
  
  console.log(`📄 Creating file: ${filename} (${blob.getBytes().length} bytes)`);
  
  // Créer le fichier dans le dossier cible
  let file;
  if (FOLDER_ID && FOLDER_ID !== 'TODO_REMPLACER_PAR_VOTRE_FOLDER_ID') {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    file = folder.createFile(blob);
  } else {
    file = DriveApp.createFile(blob);
  }
  
  const fileUrl = file.getUrl();
  console.log('✅ File created successfully:', fileUrl);
  
  // Envoyer email de notification
  sendNotificationEmail_(filename, fileUrl, blob.getBytes().length);
  
  return {
    success: true,
    message: 'Fichier uploadé avec succès',
    id: file.getId(),
    name: filename,
    url: fileUrl,
    size: blob.getBytes().length
  };
}

// ========================================
// MODE RÉSUMABLE - INIT SESSION
// ========================================
function initResumable_(filename, mimeType, fileSize) {
  console.log(`☁️ Mode résumable - Init: ${filename} (${fileSize} bytes)`);
  
  if (!filename || !fileSize) {
    throw new Error('Paramètres manquants: filename et fileSize requis');
  }
  
  // ÉTAPE 1 : GÉNÉRER UUID ET MÉTADONNÉES (TEST SANS DRIVE API)
  console.log('🔧 Générant UUID...');
  const uploadId = Utilities.getUuid();
  console.log('✅ UUID généré:', uploadId);
  
  console.log('🔧 Préparant métadonnées...');
  const metadata = {
    name: filename,
    mimeType: mimeType || 'application/octet-stream'
  };
  
  if (FOLDER_ID && FOLDER_ID !== 'TODO_REMPLACER_PAR_VOTRE_FOLDER_ID') {
    metadata.parents = [FOLDER_ID];
  }
  console.log('✅ Métadonnées préparées:', metadata);
  
  // APPELS DRIVE API AVEC GESTION SÉCURISÉE DES HEADERS
  try {
    console.log('🌐 Initialisation Drive API...');
    
    const initUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable';
    const token = getOAuth_();
    console.log('🔑 Token OAuth obtenu');
    
    const response = UrlFetchApp.fetch(initUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': mimeType || 'application/octet-stream',
        'X-Upload-Content-Length': fileSize.toString()
      },
      payload: JSON.stringify(metadata)
    });
    
    const responseCode = response.getResponseCode();
    console.log('📡 Drive API response code:', responseCode);
    
    if (responseCode !== 200) {
      const errorText = response.getContentText();
      console.error('❌ Drive API error:', errorText);
      throw new Error(`Erreur init Drive API [${responseCode}]: ${errorText}`);
    }
    
    // GESTION SÉCURISÉE DES HEADERS
    console.log('🔍 Récupération session URI...');
    let sessionUri = null;
    
    try {
      const headers = response.getHeaders();
      console.log('📋 Headers reçus:', Object.keys(headers));
      
      // Essayer plusieurs variantes de Location
      sessionUri = headers['Location'] || headers['location'] || headers['LOCATION'];
      
      if (!sessionUri) {
        console.error('❌ Headers disponibles:', headers);
        throw new Error('Session URI manquante - headers: ' + JSON.stringify(Object.keys(headers)));
      }
      
      console.log('✅ Session URI trouvée:', sessionUri.substring(0, 100) + '...');
      
    } catch (headerError) {
      console.error('❌ Erreur lecture headers:', headerError);
      throw new Error('Impossible de lire les headers de réponse Drive API: ' + headerError.message);
    }
    
    // Sauvegarder l'état de la session
    const sessionData = {
      sessionUri: sessionUri,
      filename: filename,
      mimeType: mimeType,
      fileSize: fileSize,
      uploadedBytes: 0,
      created: Date.now()
    };
    
    console.log('💾 Sauvegarde session data...');
    const properties = PropertiesService.getScriptProperties();
    properties.setProperty(STATE_PREFIX + uploadId, JSON.stringify(sessionData));
    
    console.log(`✅ Session initialisée: ${uploadId}`);
    
    return {
      success: true,
      uploadId: uploadId,
      message: 'Session d\'upload initialisée',
      chunkSize: 256 * 1024 // 256 KB - minimum requis par Google Drive API
    };
    
  } catch (driveError) {
    console.error('❌ Erreur Drive API complète:', driveError);
    throw new Error('Échec initialisation Drive API: ' + driveError.message);
  }
}

// ========================================
// MODE RÉSUMABLE - ENVOI CHUNK
// ========================================
function putChunk_(uploadId, start, end, total, bytesArrayJson) {
  console.log(`📤 Chunk upload: ${uploadId} [${start}-${end}/${total}]`);
  
  // Récupérer l'état de la session
  const properties = PropertiesService.getScriptProperties();
  const sessionDataJson = properties.getProperty(STATE_PREFIX + uploadId);
  
  if (!sessionDataJson) {
    throw new Error('Session expirée ou introuvable: ' + uploadId);
  }
  
  const sessionData = JSON.parse(sessionDataJson);
  
  // Vérifier cohérence
  if (sessionData.fileSize !== total) {
    throw new Error(`Taille incohérente: session=${sessionData.fileSize}, chunk=${total}`);
  }
  
  if (start !== sessionData.uploadedBytes) {
    throw new Error(`Offset incohérent: attendu=${sessionData.uploadedBytes}, reçu=${start}`);
  }
  
  // Recomposer le chunk depuis les données
  let chunkBytes;
  if (typeof bytesArrayJson === 'string') {
    // Données JSONP - parser le JSON pour obtenir l'array
    const bytesArray = JSON.parse(bytesArrayJson);
    chunkBytes = bytesArray;
  } else if (bytesArrayJson && bytesArrayJson.getBytes) {
    // Données FormData - déjà un blob
    chunkBytes = Array.from(bytesArrayJson.getBytes());
  } else {
    // Données array directes
    chunkBytes = bytesArrayJson;
  }
  
  // NOUVEAU: Système de buffer pour respecter minimum 256KB Google Drive
  const DRIVE_MIN_CHUNK = 256 * 1024; // 256 KB minimum requis par Google Drive
  
  // Initialiser buffer si nécessaire
  if (!sessionData.buffer) {
    sessionData.buffer = [];
    sessionData.bufferStart = sessionData.uploadedBytes;
  }
  
  // Ajouter les bytes au buffer
  sessionData.buffer = sessionData.buffer.concat(chunkBytes);
  sessionData.receivedBytes = end; // Marquer comme reçu côté client
  
  console.log(`📦 Buffer: ${sessionData.buffer.length} bytes accumulés`);
  
  const isLastChunk = (end >= total);
  const bufferReady = (sessionData.buffer.length >= DRIVE_MIN_CHUNK || isLastChunk);
  
  if (bufferReady && sessionData.buffer.length > 0) {
    console.log(`📤 Envoi buffer à Drive: ${sessionData.buffer.length} bytes`);
    
    // Créer le blob depuis le buffer
    const bufferBlob = Utilities.newBlob(sessionData.buffer, 'application/octet-stream');
    const bufferEnd = sessionData.bufferStart + sessionData.buffer.length;
    const contentRange = `bytes ${sessionData.bufferStart}-${bufferEnd - 1}/${total}`;
    
    // Envoyer le buffer à Drive
    const token = getOAuth_();
    const response = UrlFetchApp.fetch(sessionData.sessionUri, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Range': contentRange,
        'Content-Type': sessionData.mimeType
      },
      payload: bufferBlob.getBytes()
    });
    
    const responseCode = response.getResponseCode();
    console.log(`📡 Drive response: ${responseCode}`);
    
    if (responseCode === 308) {
      // Chunk accepté par Drive, vider le buffer
      sessionData.uploadedBytes = bufferEnd;
      sessionData.buffer = [];
      sessionData.bufferStart = bufferEnd;
      properties.setProperty(STATE_PREFIX + uploadId, JSON.stringify(sessionData));
      
      return {
        success: true,
        nextStart: sessionData.receivedBytes, // Continuer depuis où le client s'est arrêté
        bytesReceived: sessionData.receivedBytes,
        totalBytes: total,
        progress: Math.round((sessionData.receivedBytes / total) * 100),
        driveProgress: Math.round((sessionData.uploadedBytes / total) * 100)
      };
      
    } else if (responseCode === 200 || responseCode === 201) {
      // Upload terminé !
      const fileInfo = JSON.parse(response.getContentText());
      
      // Nettoyer la session
      properties.deleteProperty(STATE_PREFIX + uploadId);
      
      console.log(`✅ Upload terminé: ${fileInfo.id}`);
      
      // Construire URL lisible
      const fileUrl = `https://drive.google.com/file/d/${fileInfo.id}/view`;
      
      // Envoyer email de notification
      sendNotificationEmail_(sessionData.filename, fileUrl, total);
      
      return {
        success: true,
        completed: true,
        id: fileInfo.id,
        name: sessionData.filename,
        url: fileUrl,
        size: total,
        message: 'Upload terminé avec succès'
      };
      
    } else {
      throw new Error(`Erreur Drive upload: ${responseCode} - ${response.getContentText()}`);
    }
    
  } else {
    // Buffer pas encore prêt, continuer à accumuler
    properties.setProperty(STATE_PREFIX + uploadId, JSON.stringify(sessionData));
    
    return {
      success: true,
      nextStart: sessionData.receivedBytes,
      bytesReceived: sessionData.receivedBytes,
      totalBytes: total,
      progress: Math.round((sessionData.receivedBytes / total) * 100),
      buffering: true,
      bufferSize: sessionData.buffer.length,
      message: `Buffer: ${sessionData.buffer.length}/${DRIVE_MIN_CHUNK} bytes`
    };
  }
}

// ========================================
// STATUS ET HELPERS
// ========================================
function getUploadStatus_(uploadId) {
  const properties = PropertiesService.getScriptProperties();
  const sessionDataJson = properties.getProperty(STATE_PREFIX + uploadId);
  
  if (!sessionDataJson) {
    return {
      success: false,
      message: 'Session introuvable ou expirée'
    };
  }
  
  const sessionData = JSON.parse(sessionDataJson);
  
  return {
    success: true,
    uploadedBytes: sessionData.uploadedBytes,
    totalBytes: sessionData.fileSize,
    progress: Math.round((sessionData.uploadedBytes / sessionData.fileSize) * 100),
    filename: sessionData.filename
  };
}

function getOAuth_() {
  return ScriptApp.getOAuthToken();
}

// ========================================
// EMAIL NOTIFICATION (DÉSACTIVÉ POUR DEBUG)
// ========================================
function sendNotificationEmail_(filename, fileUrl, fileSize) {
  try {
    console.log('📧 Email notification demandée pour:', filename);
    console.log('📧 Taille:', Math.round(fileSize / 1024 / 1024 * 100) / 100, 'MB');
    console.log('📧 URL:', fileUrl);
    
    // EMAIL RÉACTIVÉ
    const subject = `🚀 Nouveau fichier audit ROI - ${filename}`;
    const body = `
NOUVEAU FICHIER REÇU POUR AUDIT ROI

📋 INFORMATIONS FICHIER:
• Nom: ${filename}
• Taille: ${Math.round(fileSize / 1024 / 1024 * 100) / 100} MB
• Lien: ${fileUrl}

⏰ Reçu le: ${new Date().toLocaleString('fr-FR')}

---
Traité automatiquement par YukiBuy Upload System
`;
    
    GmailApp.sendEmail('contact@yukibuy.com', subject, body);
    
    console.log('📧 Email notification envoyé à contact@yukibuy.com');
    
  } catch (error) {
    console.error('⚠️ Erreur envoi email:', error);
    // Ne pas faire échouer l'upload pour un problème d'email
  }
}

// ========================================
// FONCTION DE TEST
// ========================================
function testUpload() {
  const testData = {
    parameter: {
      mode: 'simple',
      filename: 'test.csv',
      secret: SCRIPT_SECRET
    },
    postData: {
      contents: JSON.stringify([116, 101, 115, 116]) // "test" en bytes
    }
  };
  
  const result = doPost(testData);
  console.log('Test result:', result.getContent());
}