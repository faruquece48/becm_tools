"use client";

import { BillInfo } from "./types";


interface Props {
  bill: BillInfo;
}


export default function BillPreview({
  bill,
}: Props) {


  return (

    <div className="rounded-xl border bg-slate-50 p-6">


      {/* Bill Number */}

      <div className="flex justify-end">

        <div className="rounded border px-5 py-2 font-bold">

          Bill No.: {bill.billNo || "01"}

        </div>

      </div>



      {/* Header */}

      <div className="mt-6 text-center space-y-2">


        <p className="italic text-lg">

          Heaven’s Light is Our Guide

        </p>



        <p className="text-lg font-medium">

          Department of Building Engineering & Construction Management

        </p>



        <p className="text-lg font-medium">

          Rajshahi University of Engineering & Technology

        </p>




        <div className="mt-5 text-xl font-bold">


          {bill.examination || "B.Sc. Engineering"}

          {" "}

          {bill.year || "1st Year"}

          {" "}

          {bill.semester || "Odd Semester"}


          <br />


          Examination{" "}

          {bill.examYear || "2024"}


          <br />


          (Series {bill.series || "2023"})


        </div>


      </div>


    </div>

  );

}
