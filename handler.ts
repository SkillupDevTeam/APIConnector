import fortnite from "./src/fortnite"

export {
  fortnite
};

/*
// modern module syntax
export async function hello(event: any, context: any, callback: any) {

  // dependencies work as expected
  console.log(_.VERSION)

  // async/await also works out of the box
  await new Promise((resolve, reject) => setTimeout(resolve, 500))

  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Go Serverless v1.0! Your function executed successfully!',
      input: event,
    }),
  };

  callback(null, response);
}
*/