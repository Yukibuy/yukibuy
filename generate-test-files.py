#!/usr/bin/env python3
# GÉNÉRATEUR DE FICHIERS CSV POUR TESTS YUKIBUY
# Usage: python3 generate-test-files.py

import csv
import random
import os
from datetime import datetime, timedelta

def generate_test_file(filename, target_size_mb):
    """Génère un fichier CSV de la taille spécifiée"""
    print(f"🚀 Génération de {filename} (cible: {target_size_mb}MB)")
    
    # Estimer le nombre de lignes nécessaires (environ 100-120 bytes par ligne)
    estimated_rows = int((target_size_mb * 1024 * 1024) / 110)
    
    campaigns = [
        'Google Ads Search Campaign Premium',
        'Facebook Ads Video Retargeting Advanced', 
        'Instagram Stories Brand Awareness Pro',
        'YouTube Ads Product Demo Extended',
        'LinkedIn Sponsored Content B2B Elite',
        'TikTok Ads Creative Campaign Viral',
        'Pinterest Shopping Ads Lifestyle',
        'Twitter Ads Engagement Campaign Plus'
    ]
    
    devices = ['Desktop', 'Mobile', 'Tablet']
    locations = ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Bordeaux', 'Lille', 'Nantes', 'Strasbourg']
    keywords_pool = [
        'chaussures running premium', 'smartphone dernière génération', 'ordinateur portable gaming',
        'montre connectée sport', 'écouteurs sans fil', 'tablette graphique professionnelle',
        'appareil photo reflex', 'drone 4K professionnel', 'casque réalité virtuelle',
        'imprimante 3D', 'robot aspirateur intelligent', 'caméra sécurité IP'
    ]
    
    with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = [
            'ID', 'Campaign_Name', 'Date', 'Impressions', 'Clicks', 
            'Cost_EUR', 'Revenue_EUR', 'Conversions', 'Device', 'Location', 
            'Keywords', 'Ad_Group', 'CTR', 'CPC', 'ROAS'
        ]
        
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        # Date de début (90 jours avant aujourd'hui)
        start_date = datetime.now() - timedelta(days=90)
        
        for i in range(1, estimated_rows + 1):
            # Générer des données réalistes
            impressions = random.randint(100, 50000)
            clicks = random.randint(1, int(impressions * 0.05))  # CTR réaliste
            cost = round(random.uniform(10, 500), 2)
            conversions = random.randint(0, int(clicks * 0.1))  # Taux conversion réaliste
            revenue = round(cost * random.uniform(0.5, 3.0), 2)  # ROAS variable
            
            # Date aléatoire dans les 90 derniers jours
            random_days = random.randint(0, 89)
            date = (start_date + timedelta(days=random_days)).strftime('%Y-%m-%d')
            
            # Keywords aléatoires (3-5 mots-clés)
            num_keywords = random.randint(3, 5)
            keywords = ', '.join(random.sample(keywords_pool, num_keywords))
            
            writer.writerow({
                'ID': i,
                'Campaign_Name': random.choice(campaigns),
                'Date': date,
                'Impressions': impressions,
                'Clicks': clicks,
                'Cost_EUR': cost,
                'Revenue_EUR': revenue,
                'Conversions': conversions,
                'Device': random.choice(devices),
                'Location': random.choice(locations),
                'Keywords': keywords,
                'Ad_Group': f'AdGroup_{random.randint(1, 50)}',
                'CTR': round((clicks / impressions) * 100, 2) if impressions > 0 else 0,
                'CPC': round(cost / clicks, 2) if clicks > 0 else 0,
                'ROAS': round(revenue / cost, 2) if cost > 0 else 0
            })
            
            # Afficher progression
            if i % 25000 == 0:
                print(f"📊 {i:,} lignes générées...")
    
    # Vérifier la taille finale
    file_size = os.path.getsize(filename)
    actual_size_mb = round(file_size / (1024 * 1024), 1)
    
    print(f"✅ {filename} créé: {actual_size_mb}MB ({estimated_rows:,} lignes)")
    return actual_size_mb

def main():
    """Génère tous les fichiers de test"""
    print("🧪 GÉNÉRATEUR DE FICHIERS CSV POUR TESTS YUKIBUY\n")
    
    # Créer le dossier test s'il n'existe pas
    if not os.path.exists('test-files'):
        os.makedirs('test-files')
        print("📁 Dossier 'test-files' créé")
    
    os.chdir('test-files')
    
    try:
        # Générer différentes tailles pour tester les limites
        files_generated = []
        
        print("⏳ Génération des fichiers de test...\n")
        
        # Fichier PETIT pour test JSONP (100KB)
        size = generate_test_file('Test_GoogleAds_100KB.csv', 0.1)  # 0.1MB = 100KB
        files_generated.append(('Test_GoogleAds_100KB.csv', size, 'JSONP direct'))
        
        # Fichier pour test Netlify direct
        size = generate_test_file('GoogleAds_90jours_50MB.csv', 50)
        files_generated.append(('GoogleAds_90jours_50MB.csv', size, 'Netlify direct'))
        
        # Fichier pour test Google Drive automatique
        size = generate_test_file('FacebookAds_90jours_120MB.csv', 120)
        files_generated.append(('FacebookAds_90jours_120MB.csv', size, 'Google Drive auto'))
        
        # Gros fichier e-commerce
        size = generate_test_file('Shopify_Commandes_300MB.csv', 300)
        files_generated.append(('Shopify_Commandes_300MB.csv', size, 'Google Drive auto'))
        
        # Très gros fichier combiné
        size = generate_test_file('Combined_AllPlatforms_600MB.csv', 600)
        files_generated.append(('Combined_AllPlatforms_600MB.csv', size, 'Google Drive auto'))
        
        print(f"\n🎉 TOUS LES FICHIERS DE TEST GÉNÉRÉS DANS: {os.getcwd()}")
        print("\n📋 RÉCAPITULATIF:")
        print("=" * 80)
        
        for filename, size, method in files_generated:
            print(f"📄 {filename:<35} | {size:>6}MB | {method}")
        
        print("=" * 80)
        print("\n🧪 PLAN DE TEST RECOMMANDÉ:")
        print("1️⃣  Tester avec GoogleAds_90jours_50MB.csv (doit passer par Netlify)")
        print("2️⃣  Tester avec FacebookAds_90jours_120MB.csv (doit passer par Google Drive)")
        print("3️⃣  Tester avec Shopify_Commandes_300MB.csv (upload plus long)")
        print("4️⃣  Tester avec Combined_AllPlatforms_600MB.csv (test limite haute)")
        
        print("\n💡 CONSEILS:")
        print("• Ouvrez la console (F12) pour voir les logs d'upload")
        print("• L'upload Google Drive peut prendre 2-5 minutes pour les gros fichiers")
        print("• Vérifiez vos emails et votre Google Drive après chaque test")
        
        print(f"\n✅ Prêt pour vos tests sur https://yukibuy.com ! 🚀")
        
    except Exception as e:
        print(f"❌ Erreur lors de la génération: {e}")

if __name__ == "__main__":
    main()