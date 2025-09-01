const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const nodemailer = require('nodemailer');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed'
    };
  }

  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    // Vérifier la signature Stripe pour sécurité
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`
    };
  }

  console.log('Stripe webhook event:', stripeEvent.type);

  try {
    // Configuration email
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    switch (stripeEvent.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = stripeEvent.data.object;
        
        console.log('Paiement réussi:', {
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          customer: paymentIntent.customer,
          metadata: paymentIntent.metadata
        });

        // Email de confirmation avec guide détaillé
        const confirmationEmail = `
🎉 PAIEMENT CONFIRMÉ - AUDIT ROI LANCÉ !

💳 DÉTAILS DU PAIEMENT:
• Montant: ${paymentIntent.amount / 100}€
• Transaction ID: ${paymentIntent.id}
• Date: ${new Date().toLocaleString('fr-FR')}

📋 PROCHAINES ÉTAPES IMPORTANTES:

1️⃣ UPLOADEZ VOS FICHIERS CSV (dans les 7 jours)
   Rendez-vous sur: https://yukibuy.com?success=true
   
2️⃣ FICHIERS À PRÉPARER:
   
   📊 GOOGLE ADS (Obligatoire):
   • Aller sur ads.google.com
   • Rapports → Campagnes de base
   • Période: 90 derniers jours  
   • Exporter en CSV: GoogleAds_90jours.csv
   
   📱 FACEBOOK ADS (Obligatoire):
   • business.facebook.com/adsmanager  
   • Rapports → Créer rapport personnalisé
   • Période: 90 derniers jours
   • Exporter: FacebookAds_90jours.csv
   
   🛒 E-COMMERCE (Obligatoire):
   • Shopify: Admin → Commandes → Exporter
   • WooCommerce: Commandes → Exporter  
   • Période: 90 derniers jours
   • Nom: Commandes_90jours.csv
   
   📦 PRODUITS (Optionnel mais recommandé):
   • Catalogue produits avec prix/coûts
   • Nom: Produits.csv

3️⃣ DÉLAIS & LIVRAISON:
   • Upload fichiers: Sous 7 jours maximum
   • Analyse: 2-3 jours après réception
   • Rapport: PDF 15+ pages + Call 1h
   • Total: 5-7 jours maximum

🆘 BESOIN D'AIDE ?
   • Email: contact@yukibuy.com
   • Tel: 09 52 83 46 80
   • Support exports: Répondez à cet email

🔒 GARANTIE 7 JOURS:
   Pas satisfait ? Remboursement intégral sans justification.

Merci pour votre confiance !
L'équipe YukiBuy
`;

        // Envoyer à l'email du client (récupéré des métadonnées ou receipt_email)
        const customerEmail = paymentIntent.receipt_email || 
                             paymentIntent.metadata?.customer_email ||
                             'contact@yukibuy.com'; // fallback

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: customerEmail,
          subject: '🎉 Paiement confirmé - Vos guides d\'export CSV',
          text: confirmationEmail
        });

        // Notification interne pour le propriétaire
        const internalNotification = `
💰 NOUVEAU PAIEMENT REÇU !

• Montant: ${paymentIntent.amount / 100}€
• Client: ${customerEmail}
• ID Transaction: ${paymentIntent.id}
• Date: ${new Date().toLocaleString('fr-FR')}

⚠️ ACTION REQUISE:
Le client va bientôt uploader ses fichiers CSV.
Préparez-vous à traiter l'audit sous 48h max !

Détails: https://dashboard.stripe.com
`;

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: 'contact@yukibuy.com',
          subject: `💰 Nouveau paiement - ${paymentIntent.amount / 100}€`,
          text: internalNotification
        });

        break;

      case 'payment_intent.payment_failed':
        const failedPayment = stripeEvent.data.object;
        
        console.log('Paiement échoué:', {
          error: failedPayment.last_payment_error,
          amount: failedPayment.amount / 100,
          currency: failedPayment.currency
        });

        // Optionnel: Email de relance pour paiement échoué
        break;

      case 'checkout.session.completed':
        const session = stripeEvent.data.object;
        
        console.log('Session checkout terminée:', {
          session_id: session.id,
          customer_email: session.customer_details?.email,
          amount_total: session.amount_total / 100
        });

        // Email de confirmation avec guide détaillé
        const sessionConfirmationEmail = `
🎉 PAIEMENT CONFIRMÉ - AUDIT ROI LANCÉ !

💳 DÉTAILS DU PAIEMENT:
• Montant: ${session.amount_total / 100}€
• Transaction ID: ${session.id}
• Date: ${new Date().toLocaleString('fr-FR')}

📋 PROCHAINES ÉTAPES IMPORTANTES:

1️⃣ UPLOADEZ VOS FICHIERS CSV (dans les 7 jours)
   Rendez-vous sur: https://yukibuy.com?success=true
   
2️⃣ FICHIERS À PRÉPARER:
   
   📊 GOOGLE ADS (Obligatoire):
   • Aller sur ads.google.com
   • Rapports → Campagnes de base
   • Période: 90 derniers jours  
   • Exporter en CSV: GoogleAds_90jours.csv
   
   📱 FACEBOOK ADS (Obligatoire):
   • business.facebook.com/adsmanager  
   • Rapports → Créer rapport personnalisé
   • Période: 90 derniers jours
   • Exporter: FacebookAds_90jours.csv
   
   🛒 E-COMMERCE (Obligatoire):
   • Shopify: Admin → Commandes → Exporter
   • WooCommerce: Commandes → Exporter  
   • Période: 90 derniers jours
   • Nom: Commandes_90jours.csv
   
   📦 PRODUITS (Optionnel mais recommandé):
   • Catalogue produits avec prix/coûts
   • Nom: Produits.csv

3️⃣ DÉLAIS & LIVRAISON:
   • Upload fichiers: Sous 7 jours maximum
   • Analyse: 2-3 jours après réception
   • Rapport: PDF 15+ pages + Call 1h
   • Total: 5-7 jours maximum

🆘 BESOIN D'AIDE ?
   • Email: contact@yukibuy.com
   • Tel: 09 52 83 46 80
   • Support exports: Répondez à cet email

🔒 GARANTIE 7 JOURS:
   Pas satisfait ? Remboursement intégral sans justification.

Merci pour votre confiance !
L'équipe YukiBuy
`;

        // Email client
        const sessionCustomerEmail = session.customer_details?.email || 'contact@yukibuy.com';

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: sessionCustomerEmail,
          subject: '🎉 Paiement confirmé - Vos guides d\'export CSV',
          text: sessionConfirmationEmail
        });

        // Notification interne
        const sessionInternalNotification = `
💰 NOUVEAU PAIEMENT REÇU !

• Montant: ${session.amount_total / 100}€
• Client: ${sessionCustomerEmail}
• ID Session: ${session.id}
• Date: ${new Date().toLocaleString('fr-FR')}

⚠️ ACTION REQUISE:
Le client va bientôt uploader ses fichiers CSV.
Préparez-vous à traiter l'audit sous 48h max !

Détails: https://dashboard.stripe.com
`;

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: 'contact@yukibuy.com',
          subject: `💰 Nouveau paiement - ${session.amount_total / 100}€`,
          text: sessionInternalNotification
        });

        break;

      default:
        console.log(`Événement non géré: ${stripeEvent.type}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        received: true,
        type: stripeEvent.type 
      })
    };

  } catch (error) {
    console.error('Erreur traitement webhook:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Erreur interne',
        details: error.message
      })
    };
  }
};