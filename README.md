# KartuliRead

I built this to practice recognizing Georgian script. Each exercise shows the Georgian first, gives the learner a chance to read it, and brings back missed items for review.

[Try KartuliRead in your browser](https://kartuliread.vercel.app). Start with Level 1, read the character out loud, then reveal the transcription. Choose **Couldn’t Read** to put that character into the review queue.

| Try to read it | Reveal the transcription | Review a missed item |
| --- | --- | --- |
| ![Georgian reading exercise before reveal](docs/images/exercise.jpg) | ![Transcription and meaning revealed](docs/images/reveal.jpg) | ![Progress with a missed item queued](docs/images/progress.jpg) |

## How a session works

~~~mermaid
flowchart TD
    A["Show a Georgian item"] --> B{"Could you read it?"}
    B -->|Yes| C["Advance to the next item"]
    B -->|No| D["Add it to the review queue"]
    D --> C
    C --> E["Review missed items after the set"]
~~~

Eight levels contain five sets of ten items each. The level counter shows your position. Level 1 repeats characters across sets, and missed items appear separately for review. The app saves progress in your browser, and the exercises ship as static data, so practice starts without an account or a model API call.

## Run locally

The app uses React, TypeScript, and Vite.

~~~sh
npm ci
npm run dev
~~~

~~~sh
npm run check:data
npm run typecheck
npm run build
~~~

The [exercise checks](scripts/checkExercisesData.mjs) validate the data before it goes into the application.
