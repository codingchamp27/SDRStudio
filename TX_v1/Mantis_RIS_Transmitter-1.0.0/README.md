
# Acrylic Desktop Frontend Doc - React Vite

## Note...

While typing any command in terminal if asked Password then type your system Password which you use for system login.

## Setup Instructions

1. **Open Acrylic Frontend folder:**
   - In the same directory/folder open terminal by right-click the mouse then select ```Open in Terminal```.
     
2. **Install Dependencies:**
   *In the same terminal copy and paste below command.*

   ```bash
   npm install
   npm run build

   ```

3. **Test Frontend with Backend then only proceed ahead**

4. **Creating App Image**

   - Now in the same terminal copy and paste below command one by one.
  
   ```bash
   npm run build:linux
   ```
   - A dist folder is created inside which is a .deb installer file
   - Go inside dist folder

   ```bash
   sudo dpkg -i name-of-file.deb
   ```

   - Now you can see an App with Mantiswave logo named with ```MantisIIoT``` in Show Applications on your Ubuntu Taskbar. You can also restart system to view the App.
   - After installing delete the entire folder `Gateway3.2`

## Info
- Created by `AK`

##### All Rights Reserved © Mantiswave Networks
