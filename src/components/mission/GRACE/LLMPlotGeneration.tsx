import { useEffect, useState } from "react";
import { LLMPlotGenerationEntity } from "../../../types/view";

export declare type LLMPlotGenerationProps = {
  llmPlotGenerationEntity: LLMPlotGenerationEntity;
};

export function LLMPlotGeneration({ llmPlotGenerationEntity }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //const [data, setData] = useState(null) as any; // object llm returns
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [view, setDefaultView] = useState(null) as any; // json view
  const updateDefaultView = async (tmpView) => {
    // console.log("updating view...", tmpView);
    const response = await fetch("http://localhost:5000/write", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: tmpView }),
    });
    if (response.ok) {
      console.log("Data written to file.");
    }
  };

  useEffect(() => {
    if (view == null) {
      // console.log("view is null");
      return;
    }
    console.log("Updating default view...", view);
    // updateDefaultView();
  }, [view]);
  // useEffect(() => {
  //   console.log("Updated state, retrieving file!");
  //   let tmp = null;
  //   fetch("/mango/default-view.json")
  //     .then((response) => response.json())
  //     .then((defaultView) => {
  //       const llm_entities: Array<string> =
  //         defaultView["pageGroups"][1]["pages"][3]["sections"][0]["entities"];
  //       // Append to llm portion
  //       llm_entities.push(data);
  //       tmp = defaultView;
  //       tmp["pageGroups"][1]["pages"][3]["sections"][0]["entities"] =
  //         llm_entities;
  //       console.log("New updated view: ", tmp);
  //       //defaultView
  //       //setDefaultView(tmp);
  //     })
  //     .catch((error) => {
  //       console.error("Error fetching data:", error);
  //     });
  //   updateDefaultView(tmp);
  // }, [view]);
  function submitPrompt() {
    const textarea = document.getElementById(
      "prompt-textarea"
    ) as HTMLTextAreaElement | null;
    let text = textarea?.value;

    let tmpView = null;

    console.log("Submitting prompt...");

    // Append prompt with text to fine-tune:
    text =
      text +
      ". The layers object may never be empty. All properties within the layers object must be defined. The dataset field is the name of the data. The mission field is GRACEFO. The version field is always '04'.\
    The instrument field is 'C'. The type field is always 'line'. Color is the color specified as a hex string. The field array is an array of strings describing the data fields to use. Start time is the start time specified in ISO format.\
    End time is the end time specified in ISO format.";
    // console.log("Prompt: ", text);
    // submit prompt to LLM
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    const raw = JSON.stringify({
      model: "llama3:latest",
      messages: [
        {
          role: "user",
          content: text,
        },
      ],
      stream: false,
      format: {
        type: "object",
        properties: {
          layers: {
            type: "object",
            properties: {
              mission: {
                type: "string",
              },
              type: {
                type: "string",
              },
              dataset: {
                type: "string",
              },
              version: {
                type: "string",
              },
              instrument: {
                type: "string",
              },
              color: {
                type: "string",
              },
              fields: {
                type: "array",
                items: {
                  type: "string",
                },
              },
              startTime: {
                type: "string",
              },
              endTime: {
                type: "string",
              },
            },
            required: [
              "type",
              "layers",
              "mission",
              "version",
              "instrument",
              "color",
              "field",
              "startTime",
              "endTime",
            ],
          },
        },
      },
    });
    // console.log(JSON.parse(raw));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requestOptions: any = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
    };
    fetch("http://localhost:11434/api/chat", requestOptions)
      .then((response) => response.json())
      .then((result) => {
        //console.log("This is the response:");
        //console.log(JSON.parse(result["message"]["content"]));
        const formattedData = JSON.parse(result["message"]["content"]);
        //console.log(formattedData);

        // Create template and paste response in that.
        const template = {
          layers: [formattedData["layers"]],
        };

        console.log("Response: ", template);

        fetch("/mango/default-view.json")
          .then((response) => response.json())
          .then((defaultView) => {
            const llm_entities: Array<string> =
              defaultView["pageGroups"][2]["pages"][0]["sections"][0][
                "entities"
              ];
            const tmp = llm_entities[1];
            llm_entities.pop();
            tmp["layers"] = [template["layers"][0]];
            llm_entities.push(tmp);
            // console.log("New entities: ", llm_entities);
            // Append to llm portion
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            tmpView = JSON.parse(JSON.stringify(defaultView));
            // console.log("tmp view: ", tmpView);
            tmpView["pageGroups"][2]["pages"][0]["sections"][0]["entities"] =
              llm_entities;
            // console.log("New updated view: ", tmpView);
            //defaultView
            if (tmpView) {
              updateDefaultView(tmpView);
            }
          })
          .catch((error) => {
            console.error("Error fetching data:", error);
          });
      })
      .catch((error) => console.error(error));

    // Next: make sure this does what we expect it to. start server
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", margin: "15px" }}>
      <button onClick={submitPrompt}>Generate chart</button>
      <textarea style={{ minHeight: "100px" }} id="prompt-textarea"></textarea>
    </div>
  );
}
export default LLMPlotGeneration;
