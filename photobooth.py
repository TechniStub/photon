#!/usr/bin/python
# -*- coding: utf-8 -*-
#----------------------------------------------------------------------------
# Created By  : Strub Guillaume, @aaryswastaken
# Created Date: 08/04/2017
# version: 1.0
# ---------------------------------------------------------------------------

import RPi.GPIO as GPIO
from PIL import Image
from PIL import ImageFont
from PIL import ImageDraw
from PIL import ImageEnhance
from picamera import PiCamera
from time import sleep
import os
from datetime import datetime
import tweet_api as tweet
from threading import Thread
import psutil

#Seuil de non-enregistrement des images (en Mo)
low_disk_thres = 120 * (2**20)

#Dimensions de l'étiquette
label_width = 812
label_height = 1624
label_active_height = 1200
label_active_aspect_ratio = float(label_width)/float(label_active_height)

#Paramètres prévisualisation/capture
preview_width = 1280
preview_height = 1024
capture_width = 1500
capture_height = 1200

#Attribution des broches d'E/S
button_pin = 3
twitter_pin = 27
landscape_pin = 4

#Réglages globaux
twitter_enabled = False
landscape_enabled = False

#Polices d'écriture
font_path = "/home/pi/"
font = ImageFont.truetype(font_path+"ClearSans-Light.ttf", 48)
font_verylarge = ImageFont.truetype(font_path+"ClearSans-Light.ttf", 800)

#Positionnement de la zone de capture
still_left_portrait = (1500 - label_width) / 2 # Crop, no resize
still_height_landscape = label_width * 1.5/1.2
still_top_landscape = (1200 - still_height_landscape) / 2 # Crop and resize 

preview_width_portrait = 1280.0 / 1500.0 * label_width
preview_left_portrait = (1280 - preview_width_portrait) / 2 
preview_top_landscape = (1024 - label_width) / 2

#Logos
twitter_logo = Image.open("logo-twitter.png").resize((64,64), Image.BILINEAR)

#Prépare l'image présentée en overlay sur l'apercu caméra
def prepare_img(source=None):
	img = None
	if source is None:
		img = Image.new("RGBA", (1280,1024))
	else:
		img = source.convert(mode="RGBA").resize((1280, 1024))
	draw = ImageDraw.Draw(img)
	if landscape_enabled:
		draw.rectangle([0,0,1280,preview_top_landscape],fill=(0,0,0,128))
		draw.rectangle([0,preview_top_landscape + label_width,1280,1024],fill=(0,0,0,128))
	else:
		draw.rectangle([0,0,preview_left_portrait,1024],fill=(0,0,0,128))
		draw.rectangle([preview_left_portrait+preview_width_portrait,0,1280,1024],fill=(0,0,0,128))
#	if twitter_enabled:
#		draw.text((15,15),"Publication sur Twitter : OUI",font=font)
#	else:
#		draw.text((15,15),"Publication sur Twitter : NON",font=font)
#	draw.text((100,935),"Retrouvez-nous sur twitter.com/makerfight68",font=font)
#	twitter = Image.new("RGBA", (1280,1024))
#	twitter.paste(twitter_logo, (20, preview_height - 64 - 20))
#	draw = ImageDraw.Draw(twitter)
#	if not twitter_enabled:
#		draw.line((20,preview_height-20,20+64,preview_height-64-20),fill=(192,0,0,255),width=8)
		
		
	hdd = psutil.disk_usage('/')
	if (hdd.free < low_disk_thres):
		draw.text((800,15),"Low Disk (%d MiB)" % (hdd.free / (2**20)),font=font)
	
#	img = Image.alpha_composite(img, twitter)

#	print("******* "+img.mode+" "+twitter.mode+" *******")

	return img
    

GPIO.setmode(GPIO.BCM)
GPIO.setup(button_pin, GPIO.IN, pull_up_down=GPIO.PUD_UP)
GPIO.setup(twitter_pin, GPIO.IN, pull_up_down=GPIO.PUD_UP)
GPIO.setup(landscape_pin, GPIO.IN, pull_up_down=GPIO.PUD_UP)

twitter_enabled = GPIO.input(twitter_pin)
landscape_enabled = GPIO.input(landscape_pin)

tweet.setup()

camera = PiCamera()
#Crée la couche d'overlay
img = prepare_img()
o = camera.add_overlay(img.tobytes(), size=img.size)
#Met l'overlay devant l'aperçu caméra (layer 2)
o.layer = 3
camera.resolution = (1500,1200)
camera.hflip = True
camera.vflip = True
camera.start_preview()


def do_capture():
	timestamp = datetime.now()
	filename = 'pic'+str(timestamp)+'.jpg'
	camera.capture(filename)
	os.system("cp '"+filename+"' temp.jpg")
	print("cp '"+filename+"' temp.jpg")


def confirm_capture():
	img = prepare_img()
	draw = ImageDraw.Draw(img)
	draw.rectangle([180,490,1100,580],fill=(0,0,0,128))
	draw.text((210,500),"Impression en cours, veuillez patienter...",font=font)
	o.update(img.tobytes())
	try:
		if twitter_enabled:
			tweet.tweet_image("#Makerfight by @Technistub à Motoco", filename)
	except:
		print("Twitter failed :(")
	still = Image.open('temp.jpg')
	contrast=ImageEnhance.Contrast(still)
	brightness=ImageEnhance.Brightness(contrast.enhance(1))#0.75))
	still=brightness.enhance(1.8)#1.5)
	canvas = Image.new("RGB",(812,1624))
	draw = ImageDraw.Draw(canvas)
	draw.rectangle([0,0,811,1623],(255,255,255))
	footer = Image.open("footer.png")
	canvas.paste(footer, (0,1200))
	if landscape_enabled:
		cropped = still.crop([0,still_top_landscape,1500,still_top_landscape+still_height_landscape])
		resized = cropped.resize((1200,812), resample=Image.BILINEAR)
		canvas.paste(resized.rotate(90,expand=1),(0,0))
		
	else:
		canvas.paste(still.crop([still_left_portrait,0,still_left_portrait+label_width,1200]), (0,0))
	canvas.save("output.png")
	os.system("lpr output.png &")
	
	hdd = psutil.disk_usage('/')
	if (hdd.free < low_disk_thres):
		os.remove(filename)
	
def capture_triggered():
	for i in range(0,3):
		img = prepare_img()
		draw = ImageDraw.Draw(img)
		x = 425
		y = -100
		draw.text((x-2,y-2), str(3-i), (0,0,0), font=font_verylarge)
		draw.text((x+2,y-2), str(3-i), (0,0,0), font=font_verylarge)
		draw.text((x-2,y+2), str(3-i), (0,0,0), font=font_verylarge)
		draw.text((x+2,y+2), str(3-i), (0,0,0), font=font_verylarge)
		draw.text((x,y), str(3-i), (255,255,255), font=font_verylarge)
		o.update(img.tobytes())
		sleep(1)
	img = prepare_img()
	draw = ImageDraw.Draw(img)
	if landscape_enabled:
		draw.rectangle([0,preview_top_landscape,1280,preview_top_landscape + label_width],fill=(255,255,255,128))
	else:
		draw.rectangle([preview_left_portrait,0,preview_left_portrait+preview_width_portrait,1024],fill=(255,255,255,128))
	o.update(img.tobytes())
	do_capture()
	img = prepare_img()
	o.update(img.tobytes())
	
x = 0

capture_confirmation_time = 5
factor = 3

try:
	while True:
		if GPIO.input(button_pin) == GPIO.LOW:
			capture_triggered()
			
			cancel = False
			still = Image.open('temp.jpg')
			
			# Wait for canceling if happens
			for remaining in list(range(capture_confirmation_time))[::-1]:
				# Prepare overlay
				img = prepare_img(source=still)

				draw = ImageDraw.Draw(img)

				x = 425
				y = -100
				draw.text((15, 75), "Annuler: bouton rouge", (255, 0, 0), font=font)
				draw.text((x-2,y-2), str(remaining+1), (255,0,0), font=font_verylarge)

				o.update(img.tobytes())

				# Test if button is pressed
				for i in range(50):
					if GPIO.input(button_pin) == GPIO.LOW:
						cancel = True
						break

					sleep(0.02)
				
				if cancel:
					sleep(1)
					break
			
			if not cancel:
				confirm_capture()
			
			# Back to normal overlay
			img = prepare_img()
			draw = ImageDraw.Draw(img)
			o.update(img.tobytes())




#		if GPIO.input(twitter_pin) ^ twitter_enabled:
#			print("Twitter pin changed")
#			twitter_enabled = GPIO.input(twitter_pin) 
#			img = prepare_img()
#			o.update(img.tobytes())
		
		if GPIO.input(landscape_pin) ^ landscape_enabled:
			print("landscape pin changed")
			landscape_enabled = GPIO.input(landscape_pin)
			img = prepare_img()
			o.update(img.tobytes())
		sleep(0.1)
except KeyboardInterrupt:
	pass
camera.stop_preview()