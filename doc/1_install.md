# FireEngine Installation

FireEngine has two main components to install:

 - CouchDB database
 - Node.js application server

## Installation Steps

1. Install node.js:  
   `sudo yum install node`  
   You should have at least v1.10

2. Install global tools:   
   `sudo npm install -g forever couchapp nodeunit`  
   These are installed globally (-g), so are available in the PATH.

3. Checkout a copy of FireEngine to your desired folder.  
  - *For production deployments, `/var/node/fireengine` is recommended.*   
    *If multiple deployments exist, each can have its own folder, eg `/var/node/fireengine-$APP` (and database server, and log files)*  
  - *For development deployments, create a symlink from `/var/node/fireengine` to the real location*  

4. Install CouchDB:  
   `sudo yum install couchdb`  
   *(And start the service, and set to run automatically on boot)*

5. Create a database, and push the design app into it.
   
        cd /var/node/fireengine
        curl -X PUT http://admin:ADMINPASSWORD@localhost:5984/fireengine  
        couchapp push couchapp/couchapp.js http://admin:ADMINPASSWORD@localhost:5984/fireengine`

6. Configure FireEngine.

        cd /var/node/fireengine        
        cp config/config.ini.sample config/config.ini
        vi (or whatever, I'm not your mother) config/config.ini

    Set the `server_key` to a random string, or to the same string as other services.  
    If your couchdb server is secured, create a `fireengine` user for FireEngine to use when connecting.  
    Set the `database` value to eg `http://fireengine:PASSWORD@localhost:5984/fireengine`  

7. Try starting FireEngine: `node app.js`  
   You should see "Server listening on port 8000...", and the application running.
   Press Ctrl+C to close.

8. Install the init script
  
        # Copy to /etc/init.d and make executable             
        sudo cp /var/node/fireengine/config.example/install/fireengine /etc/init.d/fireengine
        sudo chmod 755 /etc/init.d/fireengine
        # Configure to start automatically on boot
        sudo chkconfig --add fireengine
        sudo chkconfig | grep fireengine
        # Ensure the logging folder exists
        sudo mkdir /var/log/node

9. Start the FireEngine service:  
   `sudo service fireengine start`  
   `sudo service fireengine status` - should show it running.

10. Test connectivity:  
   `curl http://localhost:8000` - should return a JSON api description.
