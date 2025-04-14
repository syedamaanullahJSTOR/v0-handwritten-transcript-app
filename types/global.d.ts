interface Window {
  pdfjsLib: {
    getDocument: (options: { data: ArrayBuffer }) => { promise: Promise<any> }
    GlobalWorkerOptions: {
      workerSrc: string
    }
    version: string
  }
}
