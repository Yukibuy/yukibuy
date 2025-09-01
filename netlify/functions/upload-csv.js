const formidable = require('formidable');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

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
    console.log('Headers:', JSON.stringify(event.headers));
    
    // Parse multipart form data
    const form = formidable({
      maxFiles: 10,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      filter: ({ mimetype }) => {
        console.log('File mimetype:', mimetype);
        return mimetype && (
          mimetype.includes('csv') ||
          mimetype.includes('spreadsheet') ||
          mimetype.includes('excel') ||
          mimetype.includes('text/csv') ||
          mimetype.includes('application/csv')
        );
      }
    });

    console.log('🔍 Parsing form data...');
    const [fields, files] = await form.parse(event.body);
    
    console.log('📁 UPLOAD REÇU - Files:', Object.keys(files));
    console.log('📝 UPLOAD REÇU - Fields:', fields);

    // Extract client info
    const clientData = {
      id: uuidv4(),
      name: fields.clientName?.[0] || '',
      email: fields.clientEmail?.[0] || '',
      company: fields.clientCompany?.[0] || '',
      phone: fields.clientPhone?.[0] || '',
      monthlyBudget: fields.monthlyBudget?.[0] || '',
      notes: fields.additionalNotes?.[0] || '',
      uploadDate: new Date().toISOString(),
      files: []
    };

    // Process uploaded files ET LES PRÉPARER POUR EMAIL
    const processedFiles = [];
    const emailAttachments = [];
    
    for (const [fieldName, fileArray] of Object.entries(files)) {
      const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;
      
      if (file && file.filepath) {
        const fileData = await fs.readFile(file.filepath);
        const fileName = `${clientData.id}_${file.originalFilename}`;
        
        // Ajouter comme pièce jointe email
        emailAttachments.push({
          filename: fileName,
          content: fileData,
          contentType: file.mimetype
        });
        
        processedFiles.push({
          originalName: file.originalFilename,
          storedName: fileName,
          size: file.size,
          mimetype: file.mimetype
        });

        clientData.files.push({
          originalName: file.originalFilename,
          size: file.size,
          type: file.mimetype
        });
      }
    }

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

    // Envoyer notification au propriétaire AVEC LES FICHIERS EN PIÈCES JOINTES
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'contact@yukibuy.com', // VOTRE email
      subject: `🔥 Nouveau client audit ROI - ${clientData.company}`,
      text: ownerEmailContent,
      attachments: emailAttachments // LES FICHIERS SONT ICI !
    });

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

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: clientData.email,
      subject: '📊 Fichiers reçus - Votre audit ROI en cours',
      text: clientEmailContent
    });

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