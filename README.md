# ✨ ***Photon*** ✨

Photon est une application de photobooth crée à l'occasion du [Makerfight](https://www.makerfight.fr)

## ⚠️ ***ATTENTION: APPLICATION SOUS DEVELOPPEMENT ET DOCUMENTATION EN REDACTION, IL PEUT Y AVOIR DES ERREURS*** ⚠️

## Etat actuel du developpement

 - ✅ Partie python
 - ✅ Partie web 

## Installation

Clonez le repo: (a besoin de git) `git clone https://github.com/TechniStub/photon` dans `/home/pi`

### Dépendances

 - python2
 - python-pip

Executer un `pip install -r requirements.txt`

Pour l'application avec interface web (en developpement):
 - NodeJS (`curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash –` et `sudo apt install nodejs`)
 - NPM 
 - zip

Executer un `npm i`

Telechargez la fonte ClearSans-Light dans HOME: `wget https://www.fontsquirrel.com/fonts/download/clear-sans && unzip clear-sans`

### Imprimante

Suivre le tutoriel pour `cups` et `lpr`

### API Twitter

Créer un fichier `twitter.creds` qui contient:
```
access_token
access_token_secret
consumer_key
consumer_secret
```

### Environement (usage web)

Créer un fichier `.env` qui contient:
```
APP_USERNAME=<nom d'utilisateur>
APP_PASSWORD=<mot de passe>
APP_EXECUTABLE=python photobooth.py
```

### Execution 

Pour une execution simple (test): 

 - Pour l'application seule  `python photobooth.py`
 - Pour l'application avec l'interface web  `npm run serve`

Pour une execution plus propre:

Copiez les services avec: `sudo cp service/* /etc/systemd/system/`
et reloadez le daemon avec: `sudo systemctl daemon-reload`

 - Pour l'application seule `sudo systemctl start service/photon-standalone.service`
 - Pour l'application web `sudo systemctl start service/photon-webapp.service`

Pour une execution persistente (se lancera au démarrage):

 - Pour l'application seule `sudo systemctl enable service/photon-standalone.service`
 - Pour l'application web `sudo systemctl enable service/photon-webapp.service`

Note: L'application web lancera automatiquement l'application graphique si le paramètre est activé. Les deux services sont incompatibles

### Arret

 - Pour l'application seule: Assurez vous que le terminal qui execute l'application soit en focus et faites un `Ctrl+c`, si vous l'avez perdu, faites un `Ctrl+Alt+t` pour ouvrir un nouveau terminal et fermer le script python avec `killall python`
 - Pour l'application web: Il y aura un bouton dans le futur

## TODO:
 - Faire le bouton pour kill le process web
 - Refactor la partie python 

Pour plus d'informations, voici la plateforme de [gestion de projet associée](https://icescrum.vsahler.fr/p/PHT/)