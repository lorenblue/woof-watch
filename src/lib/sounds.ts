import { Howl } from 'howler';

export const successSound = new Howl({
	src: ['/sounds/success.mp3'],
	volume: 0.2
});

export const failureSound = new Howl({
	src: ['/sounds/failure.mp3'],
	volume: 0.2
});