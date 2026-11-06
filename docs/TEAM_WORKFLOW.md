# Lucrul în echipă cu submodule Git

MedFlow este superproject-ul care fixează commit-ul fiecărui modul:

| Folder | Repository GitHub | Responsabilitate |
| --- | --- | --- |
| Frontend | popam482/MedFlow-Frontend | React, TypeScript, Vite |
| Backend | popam482/MedFlow-Backend | Node.js, Express, TypeScript |
| Database | popam482/MedFlow-Database | Schema PostgreSQL și migrări |
| AI | popam482/MedFlow-AI | TypeScript, edge și cloud |

Cele patru persoane pot prelua câte un modul. Fiecare lucrează în propria clonă,
pe un branch propriu, și deschide un pull request în repository-ul modulului.
Separarea repository-urilor nu elimină nevoia de coordonare a contractelor API.

## Publicarea inițială

Conversia locală nu creează automat repository-urile pe GitHub. Administratorul
trebuie să se autentifice în GitHub CLI și să creeze cele patru repository-uri
goale. Comenzile următoare sunt pentru PowerShell, din rădăcina MedFlow.
Acestea creează repository-uri private; accesul colegilor se acordă separat.

```powershell
gh auth login
gh auth setup-git
gh repo create popam482/MedFlow-Frontend --private
gh repo create popam482/MedFlow-Backend --private
gh repo create popam482/MedFlow-Database --private
gh repo create popam482/MedFlow-AI --private
```

Dacă un repository există deja, verifică proprietarul și conținutul înainte de
publicare. Nu folosi force push. Publică întâi modulele, apoi superproject-ul:

```powershell
git -C Frontend push -u origin main
git -C Backend push -u origin main
git -C Database push -u origin main
git -C AI push -u origin main
git push origin main
```

Invită colegii în toate cele cinci repository-uri sau acordă acces printr-o echipă
GitHub. Până la publicarea modulelor, o clonare recursivă de pe GitHub nu poate
reconstitui structura locală. Dacă MedFlow este public, modulele private necesită
în continuare autentificare și acces explicit.

## Prima clonare

```powershell
git clone --recurse-submodules https://github.com/popam482/MedFlow.git
cd MedFlow
```

Pentru o clonă existentă, după salvarea lucrului local:

```powershell
git pull --ff-only
git submodule sync --recursive
git submodule update --init --recursive
```

## O modificare într-un modul

Exemplu pentru Frontend:

```powershell
cd Frontend
git switch main
git pull --ff-only
git switch -c feat/patient-dashboard
# Editează și verifică modificările.
git add src
git commit -m "Add patient dashboard"
git push -u origin feat/patient-dashboard
# Deschide și integrează PR-ul în repository-ul Frontend.
```

Submodulele clonate sunt implicit în detached HEAD. Creează sau selectează un
branch înainte de a lucra. Stage-uiește explicit fișierele necesare și verifică
diff-ul înainte de commit; nu include secrete sau date medicale reale.

## Integrarea versiunii unui modul

După integrarea PR-ului din modul, din rădăcina MedFlow:

```powershell
git -C Frontend switch main
git -C Frontend pull --ff-only
git switch -c chore/update-frontend
git add Frontend
git commit -m "Update Frontend version"
git push -u origin chore/update-frontend
# Deschide PR în MedFlow și verifică integrarea modulelor.
```

Commit-ul din superproject salvează referința la versiunea modulului. Commit-ul
respectiv trebuie publicat în repository-ul modulului înainte de integrarea PR-ului
din MedFlow. Pentru schimbări în mai multe module, documentează contractul API și
actualizează împreună referințele compatibile.

## Sincronizare zilnică

După commit sau stash al lucrului din fiecare modul și din superproject:

```powershell
git switch main
git pull --ff-only
git submodule update --init --recursive
git submodule status
```

`git submodule update` selectează versiunile fixate de MedFlow. Nu aduce automat
ultimul commit de pe fiecare `main`. Nu folosi `--remote` pentru sincronizarea
obișnuită a echipei.

## Starea inițială

- Istoricul modulelor existente este extras din istoricul MedFlow.
- Branch-ul local `backup/before-submodules` păstrează starea de dinaintea conversiei.
- AI conține doar structura și instrucțiunile inițiale, fără implementare.
- `Backend/package.json` conține o eroare de sintaxă preexistentă, care trebuie
  reparată înainte de instalarea dependențelor sau rularea backend-ului.
