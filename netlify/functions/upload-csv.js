const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');

// Parser multipart simple pour Netlify Functions
function parseMultipart(body, boundary) {
  const parts = body.split(`--${boundary}`);
  const fields = {};
  const files = {};
  
  parts.forEach(part => {
    if (part.includes('Content-Disposition')) {
      const lines = part.split('\r\n');
      let name = '';
      let filename = '';
      let contentType = '';
      let content = '';
      
      lines.forEach(line => {
        if (line.includes('Content-Disposition')) {
          const nameMatch = line.match(/name="([^"]+)"/);
          const filenameMatch = line.match(/filename="([^"]+)"/);
          if (nameMatch) name = nameMatch[1];
          if (filenameMatch) filename = filenameMatch[1];
        }
        if (line.includes('Content-Type')) {
          contentType = line.split(':')[1].trim();
        }
      });
      
      // Récupérer le contenu (après les headers)
      const contentStart = part.indexOf('\r\n\r\n') + 4;
      if (contentStart > 3) {
        content = part.substring(contentStart).replace(/\r\n--$/, '');
      }
      
      if (filename) {
        // C'est un fichier
        const fileObj = {
          filename,
          contentType,
          content: Buffer.from(content, 'binary'),
          size: Buffer.byteLength(content, 'binary')
        };
        
        // Support multiple files with same field name
        if (files[name]) {
          // Si le champ existe déjà, convertir en tableau ou ajouter au tableau
          if (Array.isArray(files[name])) {
            files[name].push(fileObj);
          } else {
            files[name] = [files[name], fileObj];
          }
        } else {
          files[name] = fileObj;
        }
      } else if (name && content.trim()) {
        // C'est un champ
        fields[name] = content.trim();
      }
    }
  });
  
  return { fields, files };
}

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': 'https://yukibuy.com',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    console.log('🚀 UPLOAD FUNCTION CALLED');
    console.log('Method:', event.httpMethod);
    console.log('Content-Type:', event.headers['content-type']);
    
    // Extraire le boundary du Content-Type
    const contentType = event.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(.+)$/);
    
    if (!boundaryMatch) {
      throw new Error('No boundary found in Content-Type header');
    }
    
    const boundary = boundaryMatch[1];
    console.log('Boundary found:', boundary);
    
    // Parser le body multipart
    const body = event.isBase64Encoded ? 
      Buffer.from(event.body, 'base64').toString('binary') : 
      event.body;
    
    console.log('Body length:', body.length);
    
    // Parser les champs et fichiers
    const { fields, files } = parseMultipart(body, boundary);
    
    console.log('📝 PARSED FIELDS:', Object.keys(fields));
    console.log('📁 PARSED FILES:', Object.keys(files));
    console.log('Field values:', fields);
    
    // Extraire les vraies données client
    const clientData = {
      id: uuidv4(),
      name: fields.clientName || 'Non renseigné',
      email: fields.clientEmail || 'contact@yukibuy.com',
      company: fields.clientCompany || 'Non renseigné',
      phone: fields.clientPhone || '',
      monthlyBudget: fields.monthlyBudget || '',
      notes: fields.additionalNotes || '',
      uploadDate: new Date().toISOString()
    };
    
    console.log('👤 CLIENT DATA:', clientData);
    
    // Traiter les fichiers reçus
    const processedFiles = [];
    const emailAttachments = [];
    
    Object.entries(files).forEach(([fieldName, fileOrFiles]) => {
      // Normaliser en tableau pour traitement uniforme
      const fileArray = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
      
      fileArray.forEach(file => {
        if (file.filename && file.content && file.content.length > 0) {
          const fileName = `${clientData.id}_${file.filename}`;
          
          processedFiles.push({
            originalName: file.filename,
            storedName: fileName,
            size: file.size,
            mimetype: file.contentType
          });
          
          // Ajouter en pièce jointe email
          emailAttachments.push({
            filename: fileName,
            content: file.content,
            contentType: file.contentType || 'text/csv'
          });
          
          console.log(`📎 File processed: ${file.filename} (${file.size} bytes)`);
        }
      });
    });
    
    console.log(`✅ Total files processed: ${processedFiles.length}`);

    // Configuration email (utiliser des variables d'environnement)
    const transporter = nodemailer.createTransport({
      service: 'gmail', // ou autre service
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Email de notification pour VOUS (le propriétaire)
    const ownerEmailContent = `
🚀 NOUVEAU CLIENT AUDIT ROI !

📊 INFORMATIONS CLIENT:
• Nom: ${clientData.name}
• Email: ${clientData.email}
• Entreprise: ${clientData.company}
• Téléphone: ${clientData.phone}
• Budget mensuel: ${clientData.monthlyBudget}

📁 FICHIERS REÇUS (${processedFiles.length}):
${processedFiles.map(file => `• ${file.originalName} (${(file.size/1024).toFixed(1)} KB)`).join('\n')}

📝 NOTES CLIENT:
${clientData.notes || 'Aucune note'}

⏰ Reçu le: ${new Date().toLocaleString('fr-FR')}

ID CLIENT: ${clientData.id}

---
À traiter dans les 48h max !
`;

    // Envoyer notification au propriétaire AVEC LES VRAIS FICHIERS !
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'contact@yukibuy.com', // VOTRE email
      subject: `🔥 Nouveau client audit ROI - ${clientData.company}`,
      text: ownerEmailContent,
      attachments: emailAttachments // LES VRAIS FICHIERS CSV !
    });
    
    console.log(`📧 Owner email sent with ${emailAttachments.length} attachments`);

    // Email de confirmation pour le CLIENT
    const clientEmailContent = `
Bonjour ${clientData.name},

✅ Vos fichiers ont été reçus avec succès !

📋 RÉCAPITULATIF:
• ${processedFiles.length} fichier(s) CSV uploadé(s)
• Budget déclaré: ${clientData.monthlyBudget}
• Entreprise: ${clientData.company}

⏱️ PROCHAINES ÉTAPES:
1. Analyse de vos données par notre équipe (24-48h)
2. Préparation de votre rapport personnalisé 
3. Email avec lien calendly pour booker votre call stratégie 1h

🔒 VOS DONNÉES:
• Stockées de manière sécurisée et confidentielle
• Supprimées automatiquement après l'audit
• Utilisées uniquement pour votre analyse ROI

Des questions ? Répondez simplement à cet email !

L'équipe YukiBuy
📞 09 52 83 46 80
`;

    // Email de confirmation au client (seulement si email valide)
    if (clientData.email && clientData.email.includes('@') && !clientData.email.includes('example.com')) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: clientData.email,
        subject: '📊 Fichiers reçus - Votre audit ROI en cours',
        text: clientEmailContent
      });
      console.log(`📧 Client confirmation sent to: ${clientData.email}`);
    } else {
      console.log('⚠️ Client email invalid, skipping confirmation');
    }

    // Log pour debugging (visible dans Netlify Functions)
    console.log('Upload successful:', {
      clientId: clientData.id,
      email: clientData.email,
      filesCount: processedFiles.length
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Fichiers uploadés avec succès',
        clientId: clientData.id,
        filesProcessed: processedFiles.length
      }),
    };

  } catch (error) {
    console.error('Upload error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Erreur lors du traitement des fichiers',
        details: error.message
      }),
    };
  }
};