#!/usr/bin/python
# -*- coding: utf-8 -*-
#----------------------------------------------------------------------------
# Created By  : Strub Guillaume, @aaryswastaken
# Created Date: 08/04/2017
# version: 1.0
# ---------------------------------------------------------------------------

import tweepy


def setup():
  global access_token
  access_token = ""
  global access_token_secret
  access_token_secret = ""
  global consumer_key
  consumer_key = ""
  global consumer_secret
  consumer_secret = ""

  with open("./twitter.creds", "r") as credentials:
    lines = credentials.readlines()

    access_token = lines[0]
    access_token_secret = lines[1]
    consumer_key = lines[2]
    consumer_secret = lines[3]

  global auth 
  auth = tweepy.OAuthHandler(consumer_key, consumer_secret)
  auth.set_access_token(access_token, access_token_secret)

  global api 
  api = tweepy.API(auth)

def tweet_image(message, filename):
  api.update_with_media(filename, status=message)

#tweet_image("Test Image", "pic2018-04-13 20:30:50.715243.jpg")

#api.update_status(status="Test")