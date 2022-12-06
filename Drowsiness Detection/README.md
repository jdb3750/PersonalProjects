# Drowsiness Detection
## Motivation

[The National Highway Traffic Safety Administration (NHTSA) estimated in 2017 that nearly 100,000 police-reported crashes involved drowsy drivers. Those crashes led to an estimated 50,000 injuries and 800 deaths. There is a broad agreement between the traffic safety, sleep science, and public health communities that even these statistics are understated.](https://www.nhtsa.gov/risky-driving/drowsy-driving) Therefore, the value of drowsiness detection is immeasureable.

## Methods
Detecting the drowsiness of a person could be extremely valuable for protecting the lives of drivers, especially truck drivers. It is a difficult and rather nuanced problem, however, that involves facial recognition algorithms, simple geometry, and logic. 

First of all, we're going to want to consider physical determinants of drowsiness that can be expressed mathemtically. The option that I'm choosing to go with is tracking eye movements in order to measure the duration that the eye is closed. If they're closed beyond a certain number of frames, an alert is thrown.

Imutils and dlib can track the face and cv2 can access the webcam, so that's where I'll begin.

```python
from scipy.spatial import distance
from imutils import face_utils
import imutils
import dlib
import cv2
```

how does the imutils track eyes? it uses 6 points across each eye that looks like this:

        1*   2*
    0*  (    )  3*
        5*   4*

in order to determine when an eye is closed, we can use the eye aspect ratio (EAR), which can be computed using the Euclidean distance between points across from one another. the formula for EAR can be determined with the following formula: EAR = (‖p1 - p5‖ + ‖p2 - p4‖) / 2 * ‖p0 - p3‖

```python
def eye_aspect_ratio(eye):
	A = distance.euclidean(eye[1], eye[5])
	B = distance.euclidean(eye[2], eye[4])
	C = distance.euclidean(eye[0], eye[3])
	EAR = (A + B) / (2.0 * C)
	return EAR
```

some other solutions to this problem also incorporate mouth aspect ratio (MAR) in order to track yawns. However, as a simple solution, I think that eye aspect ratio is a good enough predictor.

```python
thresh = 0.20 # this threshold will be used later to compare EAR to - if EAR is below the threshold, the frame will be flagged.
frame_check = 20 # number of consecutive frames to be checked for EAR < thresh
detect = dlib.get_frontal_face_detector()
predict = dlib.shape_predictor("models/shape_predictor_68_face_landmarks.dat")
```

now, I'll use imutils to get the indeces of the left and right eye, respectively

```python
(lStart, lEnd) = face_utils.FACIAL_LANDMARKS_68_IDXS["left_eye"]
(rStart, rEnd) = face_utils.FACIAL_LANDMARKS_68_IDXS["right_eye"]
```

now that we have all of the required components for this problem, we can set up a while loop for the webcam and continous detection/computation.

```python
cap=cv2.VideoCapture(0)
flag=0

while True:
	ret,frame = cap.read()
	frame = imutils.resize(frame, width=450)
	gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
	subjects = detect(gray, 0)
	cv2.putText(frame, "PRESS 'q' TO EXIT", (10, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 3) 
	for subject in subjects:
		shape = predict(gray, subject)
		shape = face_utils.shape_to_np(shape) #converting to NumPy Array
		leftEye = shape[lStart:lEnd]
		rightEye = shape[rStart:rEnd]
		leftEAR = eye_aspect_ratio(leftEye)
		rightEAR = eye_aspect_ratio(rightEye)
		EAR = (leftEAR + rightEAR) / 2.0
		leftEyeHull = cv2.convexHull(leftEye)
		rightEyeHull = cv2.convexHull(rightEye)
		cv2.drawContours(frame, [leftEyeHull], -1, (0, 255, 0), 1)
		cv2.drawContours(frame, [rightEyeHull], -1, (0, 255, 0), 1)
		if EAR < thresh:
			flag += 1 
			print (flag)
			if flag >= frame_check:
				cv2.putText(frame, "****************ALERT!****************", (10, 215),
					cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
				# cv2.putText(frame, "****************ALERT!****************", (10,325),
				# 	cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
				# cv2.putText(frame, "DROWSINESS ALERT!", (270, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
				#print ("Drowsy")
		else:
			flag = 0
	cv2.imshow("Frame", frame)
	key = cv2.waitKey(1) & 0xFF
	if key == ord("q"):
		break

cv2.destroyAllWindows()
cap.release()
```

![SegmentLocal](example.gif#center)

One factor in the nuance of this problem is, drowsiness isn't always represented physically. Drowsiness doesn't only make people fall asleep, but also leads to longer reaction times, shorter focus times, and overall lower spatial awareness. While the answer that I have here scratches the surface of detecting drowsiness, the addition of a heart rate monitor might increase efficacy of this solution.
