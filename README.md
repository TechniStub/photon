# ✨ ***Photon*** ✨

Photon est une application de photobooth crée à l'occasion du [Makerfight](https://www.makerfight.fr)

## Etat actuel du developpement

 - ✅ Partie python
 - ⚠️ Partie web 

## Installation

Clonez le repo: `git clone https://github.com/TechniStub/photon`

### Dépendances

 - Python2
 - python-pip

Executer un `pip install -r requirements.txt`

Pour l'application avec interface web (en developpement):
 - NodeJS
 - NPM

Executer un `npm i`

### API Twitter

Créer un fichier `twitter.creds` qui contient:
```
access_token
access_token_secret
consumer_key
consumer_secret
```

### Execution 

 - Pour l'application seule  `python photobooth.py`
 - Pour l'application avec l'interface web  `npm run serve`

### Arret

 - Pour l'application seule: Assurez vous que le terminal qui execute l'application soit en focus et faites un `Ctrl+c`, si vous l'avez perdu, faites un `Ctrl+Alt+t` pour ouvrir un nouveau terminal et fermer le script python avec `killall python`
 - Pour l'application web: Il y aura un bouton dans le futur

## TODO:
 - Faire le bouton pour kill le process web
 - Ajouter les services pour automatiser les lancements
 - Refactor la partie python 
 - Mettre les image sauvegardées dans un dossier à part
 - Ne sauvegarder que les photos avec le *footer*
 - Mettre en place une vraie gestion de projet 
 - Add log4js support