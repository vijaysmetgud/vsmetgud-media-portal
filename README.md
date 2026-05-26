This Portal is for accessing my files like pdfs, videos, audios etc on local laptop 

HELLO VIJAY METGUD



In Master node:

sudo  cp -r /media/sf_e-drive/AUDIOS--- /mnt/media/AUDIOS---
sudo chown -R 101:101 /mnt/media
sudo chmod -R 755 /mnt/media


In WORKER VM:

sudo cp -r /media/sf_e-drive/ /mnt/media/
sudo chown -R 101:101 /mnt/media
sudo chmod -R 755 /mnt/media



   1  wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb

   2  sudo dpkg -i cloudflared-linux-amd64.deb
   3  cloudflared --version
   4  cloudflared tunnel login
   5  cloudflared tunnel create media-portal   
   6  sudo mkdir -p /etc/cloudflared
   7  sudo nano /etc/cloudflared/config.yml
   8 cloudflared tunnel route dns media-portal vsmetgud.buzz   
   -----------------------------------------------------------------------------
   cloudflared tunnel create media-portal
      Tunnel credentials written to /home/vboxuser/.cloudflared/4f615c1f-bbd8-4265-a837-617a30e3fb87.json. cloudflared chose this file based on where your origin certificate was found. Keep this file secret. 

To revoke these credentials, delete the tunnel.

Created tunnel media-portal with id 4f615c1f-bbd8-4265-a837-617a30e3fb87
-----------------------------------------------------------------------------
   9  sudo nano /etc/cloudflared/config.yml


   10 TO ACCESS DOMAIN RUN this below command on K8S CLUSTER
    
ON MASTERNODE ----> helm/mediaportal ----> and execute below commands:

    helm upgrade media-portal .
    
    kubectl rollout restart deployment media-portal

    kubectl get pods -A

    k delete pods --all -A
---------------------------------------------------------------------
    cloudflared tunnel run media

    Verify Tunnel Route :  Run this to confirm DNS routing:

    cloudflared tunnel list
    cloudflared tunnel info media

    sudo nano /etc/sysctl.conf

    ADD:
         net.core.rmem_max = 7500000
         net.core.wmem_max = 7500000
   
   Apply:
   
    sudo sysctl -p     
-----------------------------------------------------------------------------

9️⃣ Important Next Step

Right now you are running tunnel manually.

Better run it as system service so it auto starts after reboot.

sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
------------------------------------------------------------------------------------

ADDED CLOCK AT THE TOP OF THE DASHBOARD


Manually install METRICS SERVER IN KUBERNETES CLUSTER
Install Metrics Server:

kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

kubectl patch deployment metrics-server -n kube-system \
--type='json' \
-p='[
{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}
]'


-------------SONARQUBE------------------

http://192.168.56.103:9000/

admin / admin123

SONARQUBE project token: sqp_2e01cc6544f6b8e63d5ab48293fb1746239423fa

client secret: 851746c1c90b62e72063723d9ed53c48bd7e3dc8
   (You will paste this into SonarQube later.)

privete key:
Private key
SHA256:3vHBrafcxpIVWuYlr3HEKYpt9lY8MAYYzlwqKCFeuKY=
Added now by vijaysmetgud

Skip to content
Settings
Developer Settings
Registration successful. You must generate a private key in order to install your GitHub App.
Settings Developer settings GitHub Apps vsmetgud-sonarqube
About
Owned by: @vijaysmetgud

App ID: 3649546

Using your App ID to get installation tokens? You can now use your Client ID instead.

Client ID: Iv23liPXGD5XX3HKyDaH

GitHub Apps can use OAuth credentials to identify users. Learn more about identifying users by reading our integration developer documentation.

Client secrets:  851746c1c90b62e72063723d9ed53c48bd7e3dc8
You need a client secret to authenticate as the application to the API.

Basic information
GitHub App name
vsmetgud-sonarqube
The name of your GitHub App.

 Markdown supported
Write
Preview
GitHub App Name
Homepage URL
http://192.168.56.103:9000
The full URL to your GitHub App’s website.

Identifying and authorizing users
The full URL to redirect to after a user authorizes an installation.
Read our Callback URL documentation for more information.

Callback URL
http://192.168.56.103:9000/oauth2/callback/github
 Request user authorization (OAuth) during installation
Requests that the installing user grants access to their identity during installation of your App



-------------------------THANK YOU GOOD BYE----------------------------------


TO RUN THE SQLITE DATABASE (To know the ubique visitors count)


sudo systemctl start sqlite
sudo systemctl enable sqlite
------------------------------------------------------------



http://localhost:3000/theatre-player

http://localhost:5173

window.open("http://localhost:5173")

---------------------------------
TO RUN THEATEE PLAYER

npm run dev -- --host