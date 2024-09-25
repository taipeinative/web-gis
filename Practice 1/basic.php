<?php

  $integer = 1000;
  $double = 99.99;
  $txt = "Applying red() makes me red!";

  function ascending_array(int $length): array {
    $arr = [];
    for ($i = 0; $i < $length; $i++) { 
      array_push($arr, $i);
    }
    return $arr;
  }

  function red($text): string {
    return "<span style=\"color: red;\">$text</span><br />";
  }

  function val_dumper($val, string $val_name): string {
    $dump = gettype($val);
    return "\$$val_name has the value of $val. It is a {$dump}.<br />";
  }
  
  echo red($txt);
  echo val_dumper($integer, "integer");
  echo val_dumper($double, "double");
  echo var_dump(ascending_array(10));
?>