# Déploiement sur la cabine Flipper

> **À qui s'adresse ce document :** étudiants déployant leurs applications sur la cabine Flipper partagée. Il couvre la connexion au réseau, la récupération du code et le déploiement sur les écrans de la cabine.
>
> **Il n'est jamais nécessaire de modifier la configuration de la cabine.** Construire et déployer une application ne touche que votre propre dépôt git et deux boutons dans le tableau de bord. Voir l'avertissement en bas de page.

## Ce que vous allez faire

1. Rejoindre le réseau privé de la cabine (Tailscale).
2. Installer git et récupérer une copie de l'application exemple.
3. Ouvrir le tableau de bord.
4. Enregistrer le dépôt git de votre application et la charger.

Le déploiement se fait entièrement depuis un tableau de bord web — aucune copie manuelle de fichiers sur la cabine n'est nécessaire.

## 1. Rejoindre le réseau de la cabine

La cabine n'est pas sur l'internet public. Elle est sur un réseau Tailscale privé, à rejoindre une seule fois.

1. Ouvrez ce lien d'invitation et acceptez-le :

   `<lien d'invitation fourni par l'enseignant>`

2. Connectez-vous (compte Google, GitHub ou Microsoft).
3. Installez le client Tailscale sur votre ordinateur depuis <https://tailscale.com/download>, puis connectez-vous avec le même compte.
4. Laissez Tailscale actif. Tant qu'il est connecté, votre ordinateur peut atteindre la cabine.

> À faire une seule fois par ordinateur.

## 2. Installer git

Votre application est un dépôt git, et la cabine la déploie directement depuis git.

- **Windows :** installer depuis <https://git-scm.com/download/win>
- **macOS :** exécuter `xcode-select --install`, ou installer depuis <https://git-scm.com/download/mac>
- **Linux :** `sudo apt install git`

Vérifier que ça fonctionne :

```sh
git --version
```

## 3. Récupérer l'application exemple

Partir de l'application exemple plutôt qu'un dossier vide — elle a déjà la bonne structure.

```sh
git clone https://github.com/PANDORMedia/fliphetic-test-2.git
cd fliphetic-test-2
```

L'utiliser comme modèle pour votre propre application : modifier les écrans, le contenu, le firmware. La signification de chaque fichier est expliquée dans **`STUDENT_GUIDE.md`**.

Quand votre application est prête, la pousser sur votre propre dépôt GitHub public.

## 4. Ouvrir le tableau de bord

Avec Tailscale connecté, ouvrir le tableau de bord dans le navigateur :

```
http://100.125.185.88:8080
```

Se connecter. Si vous n'avez pas de compte, s'inscrire sur la page de connexion quand l'inscription est ouverte, ou demander à l'enseignant d'en créer un.

## 5. Déployer l'application

Depuis le tableau de bord :

1. Cliquer sur **+ Register** et coller l'URL git du dépôt de votre application.
2. La cabine clone votre dépôt et le vérifie. Si le manifeste est invalide, le tableau de bord indique ce qui doit être corrigé.
3. Votre application apparaît dans la liste **Apps**. Cliquer sur **Load** pour la lancer — la cabine arrête l'application précédente, flashe le firmware ESP32 éventuel, démarre vos services Docker et dirige les trois écrans vers votre application.

Pour déployer une modification : commiter et pusher sur GitHub. En moins d'une minute, le tableau de bord affiche un badge **update** sur votre application — cliquer à nouveau sur **Load** pour basculer la cabine sur la nouvelle version. La cabine ne charge jamais une nouvelle version automatiquement.

## Accès SSH (rarement nécessaire)

Le déploiement **ne nécessite pas SSH** — tout ce qui précède se fait depuis le tableau de bord. Si vous devez ouvrir un terminal sur la cabine :

```sh
ssh flipper@100.125.185.88
```

Mot de passe : `<mot de passe fourni par l'enseignant>`

> À utiliser uniquement sur demande explicite. Un terminal sur la cabine permet de facilement casser quelque chose pour toute la classe — voir l'avertissement ci-dessous.

## Sur site : le Wi-Fi de la cabine

Quand vous êtes physiquement à côté de la cabine, elle diffuse son propre réseau Wi-Fi :

- **Réseau :** `FLIPHETIC_CAB0`
- **Mot de passe :** `<mot de passe fourni par l'enseignant>`

Principalement utile pour les cartes ESP32 et les téléphones. Le déploiement normal utilise Tailscale, pas ce Wi-Fi.

## Ne PAS modifier la configuration de la cabine

**C'est la règle qui compte.** La cabine est partagée par toute la classe. Sa configuration — les fichiers de config, la page **System** (écrans, appareils ESP32, utilisateurs), les paramètres réseau — est définie une fois et utilisée par tout le monde.

- **Vous n'avez jamais besoin d'y toucher.** Construire et déployer une application ne nécessite que votre propre dépôt git et les boutons **Register** / **Load**.
- Modifier un paramètre pour corriger *votre* application peut casser la cabine pour *l'application de tout le monde*.
- Si la cabine semble mal configurée ou cassée, **prévenez l'enseignant** — n'essayez pas de la corriger vous-même.

Restez dans votre propre dépôt et la page Apps du tableau de bord, et vous ne pourrez rien casser pour personne.
