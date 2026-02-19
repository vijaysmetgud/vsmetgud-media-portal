This Portal is for accessing my files like pdfs, videos, audios etc on local laptop 

HELLO VIJAY METGUD

Command to copy files from local to worker VMs:
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


    cloudflared tunnel run media-portal
